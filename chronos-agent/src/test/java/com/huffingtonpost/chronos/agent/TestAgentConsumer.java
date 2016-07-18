package com.huffingtonpost.chronos.agent;

import com.huffingtonpost.chronos.model.*;
import com.huffingtonpost.chronos.model.JobSpec.JobType;
import com.huffingtonpost.chronos.persist.BackendException;
import com.huffingtonpost.chronos.util.H2TestUtil;

import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.format.DateTimeFormatter;
import org.junit.After;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.powermock.api.mockito.PowerMockito;
import org.powermock.core.classloader.annotations.PowerMockIgnore;
import org.powermock.core.classloader.annotations.PrepareForTest;
import org.powermock.modules.junit4.PowerMockRunner;

import javax.mail.Session;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.when;

@PowerMockIgnore("javax.management.*")
@RunWith(PowerMockRunner.class)
@PrepareForTest({Utils.class, AgentConsumer.class})
public class TestAgentConsumer {

  int limit = AgentConsumer.LIMIT_JOB_RUNS;
  Reporting reporting;
  H2TestJobDaoImpl dao;
  AgentConsumer consumer;
  final int numOfConcurrentJobs = 5;
  final int numOfConcurrentReruns = 10;
  final int maxReruns = 5;
  List<SupportedDriver> drivers = H2TestUtil.createDriverForTesting();
  MailInfo mailInfo = new MailInfo("f", "f", "t", "t");

  @Before
  public void setUp() throws Exception {
    reporting = new NoReporting();
    dao = new H2TestJobDaoImpl();
    dao.setDrivers(drivers);
    dao.init();
    PowerMockito.mockStatic(Utils.class);
    when(Utils.getCurrentTime())
        .thenReturn(new DateTime(0).withZone(DateTimeZone.UTC));
    consumer = new AgentConsumer(dao, reporting, "testing.huffpo.com",
        new MailInfo("", "", "", ""),
        Session.getDefaultInstance(new Properties()), drivers, numOfConcurrentJobs,
        numOfConcurrentReruns, maxReruns, 0, 1);
    consumer.SLEEP_FOR = 20;

    AgentConsumer.setShouldSendErrorReports(false);
  }

  @After
  public void cleanup() throws Exception {
    consumer.close();
  }

  public void doSleep() {
    try {
      Thread.sleep(100);
    } catch (InterruptedException ignore) { }
  }

  @Test
  public void testReplace() {
    String strFormat = "YYYYMMdd";
    DateTimeFormatter format = QueryReplaceUtil.makeDateTimeFormat(strFormat);

    String query = String.format("SELECT * FROM ATable where time >= ${%s-1D} AND time < ${%s}", strFormat, strFormat);
    DateTime now = new DateTime().withZone(DateTimeZone.UTC);

    String expected = String.format("SELECT * FROM ATable where time >= %s AND time < %s",
        format.print(now.minusDays(1)), format.print(now));
    String actual = QueryReplaceUtil.replaceDateValues(query, now);

    assertEquals(expected, actual);
  }

  @Ignore
  public void testSendErrorReport() {
    MailInfo testInfo = new MailInfo("", "", "my.test.email@huffingtonpost.com", "");
    JobSpec aJob = new JobSpec();
    aJob.setName("A Unit Test Job");
    aJob.setCode("SELECT * FROM NOT_A_TABLE" +
      "\r\nWHERE DT >= 0;");
    Exception ex = new Exception("SQL error, blah blah blah...");
    AgentConsumer.setShouldSendErrorReports(true);
    for (int i = 1; i < 6; i++) {
      AgentConsumer.sendErrorReport(aJob, aJob.getCode(), ex, 4L,
          "testing.hostname.com", testInfo, Session.getDefaultInstance(null, null), i);
    }
    assertTrue(true);
  }

  @Test
  public void testNumOfConcurrentJobsIsHonored() throws BackendException {
    int sleepFor = 1000; // millis
    int totalJobs = 0;

    // add some long-running jobs
    for (int i = 0; i < numOfConcurrentJobs; i++) {
      JobSpec aJob = TestAgent.getTestJob("Joblah " + String.valueOf(i), dao);
      dao.createJob(aJob);
      PlannedJob pj = new PlannedJob(aJob, Utils.getCurrentTime());

      CallableJob cj = new SleepyCallableQuery(pj, dao, reporting,
        "example.com", null, null, null, drivers.get(0), 1, sleepFor * 3);
      consumer.submitJob(cj);
      totalJobs++;
    }
    doSleep();

    Map<Long, CallableJob> finished = consumer.getFinishedJobs(limit);

    assertEquals("finished:" + finished, 0, finished.size());
    assertEquals(numOfConcurrentJobs, dao.getRunningJobs().size());

    // add some short-lived jobs
    for (int i = 0; i < numOfConcurrentJobs; i++) {
      JobSpec aJob = TestAgent.getTestJob("Joblah " +
        String.valueOf(numOfConcurrentJobs+i), dao);
      dao.createJob(aJob);
      PlannedJob pj = new PlannedJob(dao.getJob(aJob.getId()), Utils.getCurrentTime());
      dao.addToQueue(pj);
      totalJobs++;
    }
    assertEquals(numOfConcurrentJobs, dao.getQueue(null).size());
    TestAgent.runRunnable(consumer);
    assertEquals(numOfConcurrentJobs, dao.getRunningJobs().size());
    assertEquals(0, consumer.getFinishedJobs(limit).size());

    TestAgent.waitUntilJobsFinished(consumer, totalJobs);

    assertEquals(0, dao.getRunningJobs().size());
    assertEquals(totalJobs, consumer.getFinishedJobs(limit).size());
  }

  @Test
  public void testGetFailedQueries() {
    JobSpec aJob = TestAgent.getTestJob("David Foster Wallace", dao);
    aJob.setCode("not a valid query...");
    dao.createJob(aJob);
    PlannedJob pj = new PlannedJob(aJob, Utils.getCurrentTime());

    CallableJob cj = new CallableQuery(pj, dao, reporting,
      "example.com", mailInfo, null, drivers.get(0), null, 1);
    consumer.submitJob(cj);

    TestAgent.waitForFail(consumer, 1);

    boolean isSuccess = cj.isSuccess();
    assertEquals(false, isSuccess);
    assertEquals(true, cj.isDone());

    Map<Long, CallableJob> expected = new HashMap<>();
    expected.put(cj.getJobId(), cj);
    assertEquals(expected, consumer.getFailedQueries(limit));
    assertEquals(1, consumer.getFinishedJobs(limit).size());
  }

  @Test
  public void testJobResubmitSuccessSecondTime() throws BackendException {
    JobSpec aJob = TestAgent.getTestJob("DFW", dao);
    String tableName = "table_dne_yet";
    aJob.setCode(String.format("select * from %s", tableName));
    dao.createJob(aJob);
    PlannedJob pj = new PlannedJob(aJob, Utils.getCurrentTime());

    CallableJob cj = new CallableQuery(pj, dao, reporting,
      "example.com", mailInfo, null, drivers.get(0), null, 1);
    consumer.submitJob(cj);

    TestAgent.waitForFail(consumer, 1);
    boolean isSuccess = cj.isSuccess();
    assertEquals(false, isSuccess);
    Map<Long, CallableJob> expected = new HashMap<>();
    expected.put(cj.getJobId(), cj);
    assertEquals(expected, consumer.getFailedQueries(limit));

    // wait for resubmit
    Long nextId = cj.getJobId()+1;
    dao.execute(
      String.format("CREATE TABLE %s (blah TEXT)", tableName));

    // run twice to verify job is not submitted again
    TestAgent.runRunnable(consumer);
    TestAgent.runRunnable(consumer);
    doSleep();
    TestAgent.runRunnable(consumer);
    TestAgent.runRunnable(consumer);
    
    TestAgent.waitUntilJobsFinished(consumer, 2);

    assertEquals(0, dao.getRunningJobs().size());
    assertEquals(2, consumer.getFinishedJobs(limit).size());
    assertEquals(1, consumer.getSuccesfulQueries(limit).size());
    assertEquals(0,
      consumer.getFinishedJobs(limit).get(nextId).getStatus().get());
    dao.execute(
      String.format("DROP TABLE IF EXISTS %s", tableName));
  }

  @Test
  public void testJobResubmitSuccessUpdateQuery() throws BackendException {
    JobSpec aJob = TestAgent.getTestJob("Robert Frank", dao);
    String tableName = "table_dne_yet";
    aJob.setCode(String.format("select * from %s", tableName));
    dao.createJob(aJob);
    PlannedJob pj = new PlannedJob(aJob, Utils.getCurrentTime());

    CallableJob cj = new CallableQuery(pj, dao, reporting,
      "example.com", mailInfo, null, drivers.get(0), null, 1);
    consumer.submitJob(cj);

    TestAgent.waitForFail(consumer, 1);
    boolean isSuccess = cj.isSuccess();
    assertEquals(false, isSuccess);
    Map<Long, CallableJob> expected = new HashMap<>();
    expected.put(cj.getJobId(), cj);
    assertEquals(expected, consumer.getFailedQueries(limit));

    Long nextId = cj.getJobId()+1;
    aJob = dao.getJob(aJob.getId());
    aJob.setCode("show tables;");
    dao.updateJob(aJob);

    TestAgent.runRunnable(consumer);
    doSleep();

    assertEquals(0, dao.getRunningJobs().size());
    assertEquals(2, consumer.getFinishedJobs(limit).size());
    assertEquals(1, consumer.getSuccesfulQueries(limit).size());
    assertEquals(0,
      consumer.getFinishedJobs(limit).get(nextId).getStatus().get());
  }

  @Test
  public void testJobResubmitMaxFailAttempts() throws BackendException {
    consumer = new AgentConsumer(dao, reporting, "testing.huffpo.com",
      new MailInfo("", "", "", ""),
      Session.getDefaultInstance(new Properties()), drivers, numOfConcurrentJobs,
      numOfConcurrentReruns, maxReruns, 1, 1);
    consumer.SLEEP_FOR = 1;
    JobSpec aJob = TestAgent.getTestJob("Simone de Beauvoir", dao);
    aJob.setCode("not a valid query...");
    dao.createJob(aJob);
    PlannedJob pj = new PlannedJob(aJob, Utils.getCurrentTime());

    CallableJob cj = new CallableQuery(pj, dao, reporting,
      "example.com", mailInfo, null, drivers.get(0), null, 1);
    consumer.submitJob(cj);
    Long id = cj.getJobId();

    // let the job run and fail
    TestAgent.waitUntilJobsFinished(consumer, 1);
    boolean isSuccess = cj.isSuccess();
    assertEquals(false, isSuccess);
    Map<Long, CallableJob> expected = new HashMap<>();
    expected.put(cj.getJobId(), cj);
    assertEquals(expected, consumer.getFailedQueries(limit));

    Long nextId = id+1;
    ExecutorService executor =
      Executors.newFixedThreadPool(10);
    // Create a bunch of threads that are contending to
    // retry jobs
    for (int i = 0 ; i < 10; i++) {
      executor.submit(new Thread() {
        public void run() {
          for (int i = 0 ; i < 1000; i++) {
            TestAgent.runRunnable(consumer);
            doSleep();
          }
        }
      });
     }
    try { Thread.sleep(10000); } catch (Exception ignore) {}
    executor.shutdownNow();

    assertEquals(0, dao.getRunningJobs().size());
    Map<Long, CallableJob> jobRuns =
      dao.getJobRuns(null, AgentConsumer.LIMIT_JOB_RUNS);
    assertEquals("jobRuns: " + jobRuns, 5, jobRuns.values().size());
    assertEquals(5, consumer.getFinishedJobs(limit).size());
    assertEquals(0, consumer.getSuccesfulQueries(limit).size());
    assertEquals(false,
      consumer.getFinishedJobs(limit).get(nextId).isSuccess());
  }

  @Test
  public void testCleanupPreviouslyRunningJobs() {
    JobSpec aJob = TestAgent.getTestJob("Mary Wollstonecraft", dao);
    long id = dao.createJob(aJob);
    PlannedJob pj = new PlannedJob(dao.getJob(id), Utils.getCurrentTime());
    SleepyCallableQuery cj = new SleepyCallableQuery(
      pj, dao, reporting, "example.com", mailInfo, null, null, drivers.get(0), 1,
      10000);
    consumer.submitJob(cj);
    doSleep();
    assertEquals(0, consumer.getFailedQueries(limit).size());
    assertEquals(1, dao.getRunningJobs().size());

    AgentConsumer.cleanupPreviouslyRunningJobs(dao,
      dao.getRunningJobs());
    assertEquals(0, dao.getRunningJobs().size());
    assertEquals(1, consumer.getFailedQueries(limit).size());
  }

  @Test
  public void testPersistJobRuns() {
    JobSpec aJob = TestAgent.getTestJob("Roxane Gay", dao);
    dao.createJob(aJob);
    PlannedJob pj = new PlannedJob(aJob, Utils.getCurrentTime());

    CallableJob cj = new CallableQuery(pj, dao, reporting,
      "example.com", mailInfo, null, drivers.get(0), null, 1);
    consumer.submitJob(cj);
    TestAgent.waitUntilJobsFinished(consumer, 1);
    assertEquals(1, consumer.getSuccesfulQueries(limit).size());
    // Let job run and result doesn't matter
    // Now we should be able to get job history from a new consumer
    // and the job above should exist!
    JobDao local = new H2TestJobDaoImpl();
    local.setDataSource(H2TestUtil.getDataSource());
    assertEquals(1,
      local.getJobRuns(null, AgentConsumer.LIMIT_JOB_RUNS).values().size());
  }

  @Test
  public void testJobNoResubmit() throws BackendException {
    consumer = new AgentConsumer(dao, reporting, "testing.huffpo.com",
      new MailInfo("", "", "", ""),
      Session.getDefaultInstance(new Properties()), drivers,numOfConcurrentJobs,
      numOfConcurrentReruns, maxReruns, 1, 1);
    consumer.SLEEP_FOR = 1;
    JobSpec aJob = TestAgent.getTestJob("Hannah Arendt", dao);
    aJob.setCode("not a valid query...");
    aJob.setShouldRerun(false);
    dao.createJob(aJob);
    PlannedJob pj = new PlannedJob(aJob, Utils.getCurrentTime());

    CallableJob cj = new CallableQuery(pj, dao, reporting,
      "example.com", mailInfo, null, drivers.get(0), null, 1);
    consumer.submitJob(cj);

    // let the job run and fail
    TestAgent.waitUntilJobsFinished(consumer, 1);
    boolean isSuccess = cj.isSuccess();
    assertEquals(false, isSuccess);
    Map<Long, CallableJob> expected = new HashMap<>();
    expected.put(cj.getJobId(), cj);
    assertEquals(expected, consumer.getFailedQueries(limit));

    // See if the job retries
    TestAgent.runRunnable(consumer);
    doSleep();

    assertEquals(0, dao.getRunningJobs().size());
    Map<Long, CallableJob> jobRuns =
      dao.getJobRuns(null, AgentConsumer.LIMIT_JOB_RUNS);
    assertEquals("jobRuns: " + jobRuns, 1, jobRuns.values().size());
    assertEquals(1, consumer.getFinishedJobs(limit).size());
    assertEquals(0, consumer.getSuccesfulQueries(limit).size());
  }

  public void testCancelPendingJob() throws BackendException {
    JobSpec aJob = TestAgent.getTestJob("Foucault", dao);
    aJob.setShouldRerun(true);
    long id = dao.createJob(aJob);
    PlannedJob pj = new PlannedJob(dao.getJob(id),
      Utils.getCurrentTime());

    dao.addToQueue(pj);
    int actual = dao.cancelJob(pj);
    assertEquals(1, actual);
    actual = dao.cancelJob(pj);
    assertEquals(0, actual);

    TestAgent.runRunnable(consumer);

    assertEquals(0, dao.getRunningJobs().size());
    assertEquals(0, consumer.getFinishedJobs(limit).size());
    assertEquals(0, consumer.getSuccesfulQueries(limit).size());
    assertEquals(0, consumer.getFailedQueries(limit).size());
  }

  /**
   * NOTE: sometimes the underlying OS is not happy with creating the script
   * jobs and returns "Resource temporarily unavailable"
   * @throws Exception
   */
  @Ignore
  public void testQueueLarge() throws Exception {
    for (int j = 0; j < 100; j++) {
      cleanup();
      setUp();
      // queue up some long-running jobs
      for (int i = 0; i < numOfConcurrentJobs-1; i++) {
        JobSpec aJob = TestAgent.getTestJob("Foucault "+i, dao);
        aJob.setShouldRerun(true);
        long id = dao.createJob(aJob);
        PlannedJob pj = new PlannedJob(dao.getJob(id),
          Utils.getCurrentTime());
        CallableJob cj = new SleepyCallableQuery(pj, dao, reporting,
          "example.com", null, null, null, drivers.get(0), 1, 10000);
        consumer.submitJob(cj);
      }

      // 1 that will get dequeued and some extra
      for (int i = 0; i < numOfConcurrentJobs+1; i++) {
        JobSpec aJob = TestAgent.getTestJob("Foucault "+(numOfConcurrentJobs), dao);
        aJob.setType(JobType.Script);
        aJob.setCode("sleep 1; echo \"done\";");
        long id = dao.createJob(aJob);
        PlannedJob pj = new PlannedJob(dao.getJob(id),
          Utils.getCurrentTime());
        dao.addToQueue(pj);
      }
      assertEquals(numOfConcurrentJobs+1, dao.getQueue(null).size());
      assertEquals(0, consumer.getFinishedJobs(limit).size());
      assertEquals(0, consumer.getSuccesfulQueries(limit).size());
      assertEquals(0, consumer.getFailedQueries(limit).size());

      TestAgent.runRunnable(consumer);
      doSleep();
      TestAgent.runRunnable(consumer);

      // make sure queue is populated with extra
      assertEquals(numOfConcurrentJobs+1, dao.getQueue(null).size());
      assertEquals(consumer.getFinishedJobs(limit).toString(),
                   0, consumer.getFinishedJobs(limit).size());
      assertEquals(0, consumer.getSuccesfulQueries(limit).size());
      assertEquals(0, consumer.getFailedQueries(limit).size());
    }
  }
}
