package com.huffingtonpost.chronos.agent;

import com.huffingtonpost.chronos.model.*;
import com.huffingtonpost.chronos.persist.BackendException;
import com.huffingtonpost.chronos.util.H2TestUtil;

import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.junit.After;
import org.junit.Before;
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
import static org.mockito.Mockito.when;

@PowerMockIgnore("javax.management.*")
@RunWith(PowerMockRunner.class)
@PrepareForTest({Utils.class, AgentConsumer.class})
public class TestAgentConsumerWithSleep {

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
      numOfConcurrentReruns, maxReruns, 1, 1);
    consumer.SLEEP_FOR = 1;

    AgentConsumer.setShouldSendErrorReports(false);
  }

  @After
  public void cleanup() throws Exception {
    consumer.close();
  }

  @Test
  public void testJobResubmitMaxFailAttempts() throws BackendException {
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
            TestAgentConsumer.doSleep();
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
    Map<Long, CallableJob> success = consumer.getSuccesfulQueries(limit);
    assertEquals("successful Queries:" + success, 0, success.size());
    assertEquals(false,
      consumer.getFinishedJobs(limit).get(nextId).isSuccess());
  }

  @Test
  public void testJobNoResubmit() throws BackendException {
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
    TestAgentConsumer.doSleep();

    assertEquals(0, dao.getRunningJobs().size());
    Map<Long, CallableJob> jobRuns =
      dao.getJobRuns(null, AgentConsumer.LIMIT_JOB_RUNS);
    assertEquals("jobRuns: " + jobRuns, 1, jobRuns.values().size());
    assertEquals(1, consumer.getFinishedJobs(limit).size());
    assertEquals(0, consumer.getSuccesfulQueries(limit).size());
  }

}
