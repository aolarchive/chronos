package com.huffingtonpost.chronos.agent;

import com.huffingtonpost.chronos.model.*;
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
import java.util.concurrent.ConcurrentSkipListMap;
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
        numOfConcurrentReruns, maxReruns, 0);
    consumer.SLEEP_FOR = 20;

    AgentConsumer.setShouldSendErrorReports(false);
  }

  @After
  public void cleanup() throws Exception {
    consumer.close();
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

  @Test(timeout=10000)
  public void testNumOfConcurrentJobsIsHonored() {
    int sleepFor = 1000; // millis
    int totalJobs = 0;

    // add some long-running jobs
    for (int i = 0; i < numOfConcurrentJobs; i++) {
      JobSpec aJob = TestAgent.getTestJob("Joblah " + String.valueOf(i), dao);
      dao.createJob(aJob);
      PlannedJob pj = new PlannedJob(aJob, Utils.getCurrentTime());

      CallableJob cj = new SleepyCallableQuery(pj, dao, reporting,
        "example.com", null, null, drivers.get(0), 1, sleepFor * 3);
      consumer.submitJob(cj);
      totalJobs++;
    }

    Map<Long, CallableJob> pending = consumer.getPendingJobs(limit);
    while ((pending = consumer.getPendingJobs(limit)).size() >= 1) {
      // let the jobs start running
      try { Thread.sleep(100); } catch (Exception ex) {}
    }
    Map<Long, CallableJob> finished = consumer.getFinishedJobs(limit);

    assertEquals("finished:" + finished, 0, finished.size());
    assertEquals("pending:" + pending, 0, pending.size());
    assertEquals(numOfConcurrentJobs, consumer.getRunningJobs(limit).size());

    // add some short-lived jobs
    for (int i = 0; i < numOfConcurrentJobs; i++) {
      JobSpec aJob = TestAgent.getTestJob("Joblah " +
        String.valueOf(numOfConcurrentJobs+i), dao);
      dao.createJob(aJob);
      PlannedJob pj = new PlannedJob(aJob, Utils.getCurrentTime());

      CallableJob cj = new SleepyCallableQuery(pj, dao, reporting,
        "example.com", null, null, drivers.get(0), 1, sleepFor);
      consumer.submitJob(cj);
      totalJobs++;
    }

    assertEquals(0, consumer.getFinishedJobs(limit).size());
    assertEquals(numOfConcurrentJobs, consumer.getPendingJobs(limit).size());
    assertEquals(numOfConcurrentJobs, consumer.getRunningJobs(limit).size());

    TestAgent.waitUntilJobsFinished(consumer, totalJobs);

    assertEquals(0, consumer.getRunningJobs(limit).size());
    assertEquals(0, consumer.getPendingJobs(limit).size());
    assertEquals(totalJobs, consumer.getFinishedJobs(limit).size());
  }

  @Test(timeout=2000)
  public void testGetFailedQueries() {
    JobSpec aJob = TestAgent.getTestJob("David Foster Wallace", dao);
    aJob.setCode("not a valid query...");
    dao.createJob(aJob);
    PlannedJob pj = new PlannedJob(aJob, Utils.getCurrentTime());

    CallableJob cj = new CallableQuery(pj, dao, reporting,
      "example.com", mailInfo, null, drivers.get(0), 1);
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

  //@Test(timeout=20000)
  @Ignore
  public void testJobResubmitSuccessSecondTime() {
    JobSpec aJob = TestAgent.getTestJob("DFW", dao);
    String tableName = "table_dne_yet";
    aJob.setCode(String.format("select * from %s", tableName));
    dao.createJob(aJob);
    PlannedJob pj = new PlannedJob(aJob, Utils.getCurrentTime());

    CallableJob cj = new CallableQuery(pj, dao, reporting,
      "example.com", mailInfo, null, drivers.get(0), 1);
    consumer.submitJob(cj);

    TestAgent.waitForFail(consumer, 1);
    boolean isSuccess = cj.isSuccess();
    assertEquals(false, isSuccess);
    Map<Long, CallableJob> expected = new HashMap<>();
    expected.put(cj.getJobId(), cj);
    assertEquals(expected, consumer.getFailedQueries(limit));

    // wait for resubmit
    Long nextId = new Long(cj.getJobId()+1);
    dao.execute(
      String.format("CREATE TABLE %s (blah TEXT)", tableName));

    // run twice to verify job is not submitted again
    TestAgent.runRunnable(consumer);
    TestAgent.runRunnable(consumer);
    try { Thread.sleep(250); } catch (Exception ex) {}
    TestAgent.runRunnable(consumer);
    TestAgent.runRunnable(consumer);
    
    TestAgent.waitUntilJobsFinished(consumer, 2);

    assertEquals(0, consumer.getRunningJobs(limit).size());
    assertEquals(0, consumer.getPendingJobs(limit).size());
    assertEquals(2, consumer.getFinishedJobs(limit).size());
    assertEquals(1, consumer.getSuccesfulQueries(limit).size());
    assertEquals(true,
      consumer.getFinishedJobs(limit).get(nextId).getStatus().get());
    dao.execute(
      String.format("DROP TABLE IF EXISTS %s", tableName));
  }

  @Test(timeout=20000)
  public void testJobResubmitMaxFailAttempts() {
    consumer = new AgentConsumer(dao, reporting, "testing.huffpo.com",
      new MailInfo("", "", "", ""),
      Session.getDefaultInstance(new Properties()), drivers, numOfConcurrentJobs,
      numOfConcurrentReruns, maxReruns, 1);
    consumer.SLEEP_FOR = 1;
    JobSpec aJob = TestAgent.getTestJob("Simone de Beauvoir", dao);
    aJob.setCode("not a valid query...");
    dao.createJob(aJob);
    PlannedJob pj = new PlannedJob(aJob, Utils.getCurrentTime());

    CallableJob cj = new CallableQuery(pj, dao, reporting,
      "example.com", mailInfo, null, drivers.get(0), 1);
    consumer.submitJob(cj);
    Long id = cj.getJobId();

    // let the job run and fail
    TestAgent.waitUntilJobsFinished(consumer, 1);
    boolean isSuccess = cj.isSuccess();
    assertEquals(false, isSuccess);
    Map<Long, CallableJob> expected = new HashMap<>();
    expected.put(cj.getJobId(), cj);
    assertEquals(expected, consumer.getFailedQueries(limit));

    Long nextId = new Long(id+1);
    ExecutorService executor =
      Executors.newFixedThreadPool(10);
    // Create a bunch of threads that are contending to
    // retry jobs
    for (int i = 0 ; i < 10; i++) {
      executor.submit(new Thread() {
        public void run() {
          for (int i = 0 ; i < 1000; i++) {
            TestAgent.runRunnable(consumer);
            try {
              Thread.sleep(100);
            } catch (InterruptedException e) {}
            TestAgent.runRunnable(consumer);
          }
        }
      });
     }
    try { Thread.sleep(10000); } catch (Exception ex) {}
    executor.shutdownNow();
    
    while (consumer.getRunningJobs(limit).size() != 0 ||
           consumer.getPendingJobs(limit).size() != 0) {
      try { Thread.sleep(100); } catch (Exception ex) {}
    }

    assertEquals(0, consumer.getRunningJobs(limit).size());
    assertEquals(0, consumer.getPendingJobs(limit).size());
    Map<Long, CallableJob> jobRuns =
      consumer.getJobRuns(AgentConsumer.LIMIT_JOB_RUNS);
    assertEquals("jobRuns: " + jobRuns, 5, jobRuns.values().size());
    assertEquals(5, consumer.getFinishedJobs(limit).size());
    assertEquals(0, consumer.getSuccesfulQueries(limit).size());
    assertEquals(false,
      consumer.getFinishedJobs(limit).get(nextId).isSuccess());
  }

  @Test
  public void testCleanupPreviouslyRunningJobs() {
    JobSpec aJob = TestAgent.getTestJob("Mary Wollstonecraft", dao);
    ConcurrentSkipListMap<Long, CallableJob> actual =
      new ConcurrentSkipListMap<>();
    PlannedJob pj = new PlannedJob(aJob, Utils.getCurrentTime());
    CallableJob cj = new CallableQuery(
      pj, dao, reporting, "example.com", mailInfo, null, drivers.get(0), 1);
    cj.start.set(System.currentTimeMillis());
    actual.put(cj.getJobId(), cj);

    assertEquals(true, AgentConsumer.isJobRunningAndNotDone(cj));
    assertEquals(false, AgentConsumer.isJobFailed(cj));

    AgentConsumer.cleanupPreviouslyRunningJobs(dao, actual);
    assertEquals(true, AgentConsumer.isJobFailed(cj));
  }

  @Test
  public void testPersistJobRuns() {
    JobSpec aJob = TestAgent.getTestJob("Roxane Gay", dao);
    dao.createJob(aJob);
    PlannedJob pj = new PlannedJob(aJob, Utils.getCurrentTime());

    CallableJob cj = new CallableQuery(pj, dao, reporting,
      "example.com", mailInfo, null, drivers.get(0), 1);
    consumer.submitJob(cj);
    TestAgent.waitUntilJobsFinished(consumer, 1);
    assertEquals(1, consumer.getSuccesfulQueries(limit).size());
    // Let job run and result doesn't matter
    // Now we should be able to get job history from a new consumer
    // and the job above should exist!
    AgentConsumer local = new AgentConsumer(dao, reporting,
        "testing.huffpo.com",
        new MailInfo("", "", "", ""),
        Session.getDefaultInstance(new Properties()), drivers,
        numOfConcurrentJobs, numOfConcurrentReruns, maxReruns, 0);
    local.init();
    assertEquals(1,
      local.getJobRuns(AgentConsumer.LIMIT_JOB_RUNS).values().size());
  }

  @Test(timeout=2000)
  public void testJobNoResubmit() {
    consumer = new AgentConsumer(dao, reporting, "testing.huffpo.com",
      new MailInfo("", "", "", ""),
      Session.getDefaultInstance(new Properties()), drivers,numOfConcurrentJobs,
      numOfConcurrentReruns, maxReruns, 1);
    consumer.SLEEP_FOR = 1;
    JobSpec aJob = TestAgent.getTestJob("Hannah Arendt", dao);
    aJob.setCode("not a valid query...");
    aJob.setShouldRerun(false);
    dao.createJob(aJob);
    PlannedJob pj = new PlannedJob(aJob, Utils.getCurrentTime());

    CallableJob cj = new CallableQuery(pj, dao, reporting,
      "example.com", mailInfo, null, drivers.get(0), 1);
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
    try {
      Thread.sleep(1000);
    } catch (InterruptedException e) {
      e.printStackTrace();
    }

    assertEquals(0, consumer.getRunningJobs(limit).size());
    assertEquals(0, consumer.getPendingJobs(limit).size());
    Map<Long, CallableJob> jobRuns =
      consumer.getJobRuns(AgentConsumer.LIMIT_JOB_RUNS);
    assertEquals("jobRuns: " + jobRuns, 1, jobRuns.values().size());
    assertEquals(1, consumer.getFinishedJobs(limit).size());
    assertEquals(0, consumer.getSuccesfulQueries(limit).size());
  }

  public void testCancelPendingJob() {
    JobSpec aJob = TestAgent.getTestJob("Foucault", dao);
    aJob.setShouldRerun(true);
    long id = dao.createJob(aJob);
    PlannedJob pj = new PlannedJob(dao.getJob(id),
      Utils.getCurrentTime());

    dao.addToQueue(pj);
    dao.cancelJob(pj);

    TestAgent.runRunnable(consumer);

    assertEquals(0, consumer.getRunningJobs(limit).size());
    assertEquals(0, consumer.getPendingJobs(limit).size());
    assertEquals(0, consumer.getFinishedJobs(limit).size());
    assertEquals(0, consumer.getSuccesfulQueries(limit).size());
    assertEquals(0, consumer.getFailedQueries(limit).size());
  }

  @Test(timeout=2000)
  public void testQueueLarge() {
    int extra = numOfConcurrentJobs;
    int total = numOfConcurrentJobs*2;

    // queue up a bunch of long-running jobs
    for (int i = 0; i < numOfConcurrentJobs; i++) {
      JobSpec aJob = TestAgent.getTestJob("Foucault "+i, dao);
      aJob.setShouldRerun(true);
      long id = dao.createJob(aJob);
      PlannedJob pj = new PlannedJob(dao.getJob(id),
        Utils.getCurrentTime());
      CallableJob cj = new SleepyCallableQuery(pj, dao, reporting,
        "example.com", null, null, drivers.get(0), 1, 10000);
      consumer.submitJob(cj);
    }

    // and now queue some extra
    for (int i = 0; i < numOfConcurrentJobs; i++) {
      JobSpec aJob = TestAgent.getTestJob("Foucault "+(numOfConcurrentJobs), dao);
      aJob.setShouldRerun(true);
      long id = dao.createJob(aJob);
      PlannedJob pj = new PlannedJob(dao.getJob(id),
        Utils.getCurrentTime());
      dao.addToQueue(pj);
    }
    assertEquals(extra, dao.getQueue().size());
    assertEquals(0, consumer.getFinishedJobs(limit).size());
    assertEquals(0, consumer.getSuccesfulQueries(limit).size());
    assertEquals(0, consumer.getFailedQueries(limit).size());
    
    TestAgent.runRunnable(consumer);
    try {
      Thread.sleep(500);
    } catch (InterruptedException e) {
      e.printStackTrace();
    }
    TestAgent.runRunnable(consumer);
    
    // make sure queue is populated with extra
    assertEquals(numOfConcurrentJobs, consumer.getRunningJobs(limit).size());
    assertEquals(extra, dao.getQueue().size());
    assertEquals(0, consumer.getFinishedJobs(limit).size());
    assertEquals(0, consumer.getSuccesfulQueries(limit).size());
    assertEquals(0, consumer.getFailedQueries(limit).size());
  }
}
