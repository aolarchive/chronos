package com.huffingtonpost.chronos.agent;

import com.huffingtonpost.chronos.model.*;
import com.huffingtonpost.chronos.model.JobSpec.JobType;
import com.huffingtonpost.chronos.util.H2TestUtil;

import junit.framework.Assert;

import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.format.DateTimeFormatter;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.powermock.api.mockito.PowerMockito;
import org.powermock.core.classloader.annotations.PowerMockIgnore;
import org.powermock.core.classloader.annotations.PrepareForTest;
import org.powermock.modules.junit4.PowerMockRunner;

import javax.mail.Session;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.*;
import java.util.Map.Entry;

import static org.junit.Assert.*;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

@PowerMockIgnore("javax.management.*")
@RunWith(PowerMockRunner.class)
@PrepareForTest({Utils.class, AgentConsumer.class})
public class TestAgent {

  AgentDriver agentDriver;
  AgentConsumer consumer;
  static H2TestJobDaoImpl dao;
  Reporting reporting;
  final int numOfConcurrentJobs = 5;
  final int numOfConcurrentReruns = 10;
  final int maxReruns = 5;
  List<SupportedDriver> drivers = H2TestUtil.createDriverForTesting();

  @Before
  public void setUp() throws Exception {
    reporting = new NoReporting();
    dao = new H2TestJobDaoImpl();
    dao.setDrivers(drivers);
    dao.init();
    PowerMockito.mockStatic(Utils.class);
    when(Utils.getCurrentTime())
        .thenReturn(new DateTime(0).withZone(DateTimeZone.UTC));
    agentDriver = getMockedDriver(dao, reporting);
    agentDriver.SLEEP_FOR = 10;
    consumer = new AgentConsumer(dao, reporting, "testing.huffpo.com",
        new MailInfo("", "", "", ""),
        Session.getDefaultInstance(new Properties()), drivers,
        numOfConcurrentJobs, numOfConcurrentReruns, maxReruns, 60);
    AgentConsumer.setShouldSendErrorReports(false);
    consumer.SLEEP_FOR = 1;
  }

  @After
  public void cleanup() throws Exception {
    agentDriver.close();
    consumer.close();
  }

  public static AgentDriver getMockedDriver(JobDao dao, Reporting reporting) {
    return spy(new AgentDriver(dao, reporting));
  }

  public static void runRunnable(Stoppable stoppable) {
    stoppable.doRun();
  }

  public static void waitUntilJobsFinished(AgentConsumer c, int count) {
    while (c.getFinishedJobs(AgentConsumer.LIMIT_JOB_RUNS).size() != count) {
      try { Thread.sleep(100); } catch (Exception ex) { ex.printStackTrace();}
    }
  }

  public static void waitForFail(AgentConsumer c, int count) {
    while (c.getFailedQueries(AgentConsumer.LIMIT_JOB_RUNS).size() != count) {
      try { Thread.sleep(100); } catch (Exception ex) { ex.printStackTrace();}
    }
  }


  public static JobSpec getTestJob(String aName, JobDao dao) {
    JobSpec aJob = new JobSpec();
    aJob.setName(aName);
    aJob.setInterval(JobSpec.Interval.Hourly);
    DateTime now = Utils.getCurrentTime();
    aJob.setStartMinute(now.getMinuteOfHour());
    aJob.setStartHour(now.getHourOfDay());
    aJob.setStartDay(now.getDayOfWeek());
    aJob.setDriver(H2TestUtil.H2_NAME);
    aJob.setCode("show tables;");
    aJob.setResultTable("ARESULTTABLE");
    aJob.setEnabled(true);
    aJob.setStatusEmail(Arrays.asList(new String[]{ "blah@example.com" }));
    aJob.setType(JobType.Query);
    return aJob;
  }

  public static JobSpec getTestScript(String aName, JobDao dao) {
    JobSpec aJob = getTestJob(aName, dao);
    aJob.setType(JobType.Script);
    aJob.setCode("echo 'beep';");
    aJob.setResultTable(null);
    return aJob;
  }

  @Test
  public void testShouldJobRun() {
    JobSpec aJob = getTestJob("Kurt Vonnegut", dao);
    // verify enabled
    {
      aJob.setEnabled(false);
      boolean actual = AgentDriver.shouldJobRun(aJob,
          Utils.getCurrentTime());
      assertEquals(false, actual);

      aJob.setEnabled(true);
      actual = AgentDriver.shouldJobRun(aJob,
          Utils.getCurrentTime());
      assertEquals(true, actual);
    }

    // verify Monthly
    {
      aJob.setInterval(JobSpec.Interval.Monthly);
      boolean actual = AgentDriver.shouldJobRun(aJob,
          Utils.getCurrentTime().withDayOfMonth(1));
      assertEquals(true, actual);
      actual = AgentDriver.shouldJobRun(aJob,
          Utils.getCurrentTime().withDayOfMonth(2));
      assertEquals(false, actual);
    }

    // verify Weekly
    {
      aJob.setInterval(JobSpec.Interval.Weekly);
      boolean actual = AgentDriver.shouldJobRun(aJob,
          Utils.getCurrentTime().withDayOfWeek(aJob.getStartDay()));
      assertEquals(true, actual);
      actual = AgentDriver.shouldJobRun(aJob,
          Utils.getCurrentTime().withDayOfWeek(aJob.getStartDay()+1));
      assertEquals(false, actual);
    }

    // verify Daily
    {
      aJob.setInterval(JobSpec.Interval.Daily);
      boolean actual = AgentDriver.shouldJobRun(aJob,
          Utils.getCurrentTime());
      assertEquals(true, actual);
      actual = AgentDriver.shouldJobRun(aJob,
          Utils.getCurrentTime().plusHours(1));
      assertEquals(false, actual);
    }

    // verify Hourly
    {
      aJob.setInterval(JobSpec.Interval.Hourly);
      boolean actual = AgentDriver.shouldJobRun(aJob,
          Utils.getCurrentTime());
      assertEquals(true, actual);

      actual = AgentDriver.shouldJobRun(aJob,
          Utils.getCurrentTime().plusHours(1));
      assertEquals(true, actual);

      actual = AgentDriver.shouldJobRun(aJob,
          Utils.getCurrentTime().plusHours(1).plusDays(1));
      assertEquals(true, actual);

      actual = AgentDriver.shouldJobRun(aJob,
          Utils.getCurrentTime().plusMinutes(1));
      assertEquals(false, actual);
    }
  }

  @Test(timeout=2000)
  public void testBasic() throws Exception {
    String jobName = "Jean Paul Sartre";
    for (JobSpec aJob : new JobSpec[]{ getTestJob(jobName, dao),
      getTestScript(jobName, dao) }) {
      aJob.setResultTable(null);
      try {
        dao.createJob(aJob);
      } catch (Exception ex) { ex.printStackTrace(); }
      runRunnable(agentDriver);

      List<PlannedJob> expected = new ArrayList<>();
      expected.add(new PlannedJob(aJob, Utils.getCurrentTime()));
      assertEquals(expected, dao.getQueue());

      expected.clear();
      runRunnable(consumer);

      assertEquals(expected, dao.getQueue());
      dao.deleteJob(aJob.getId());
    }
  }

  @Test(timeout=2000)
  public void testBasicWithFail() throws Exception {
    String resultTable = "SHOULDNT_EXIST";

    // make sure table doesn't exist
    dropTable(resultTable);

    JobSpec aJob = getTestJob("Michael Scott", dao);
    aJob.setResultTable(resultTable);
    // Second query should not be executed since the first one fails
    aJob.setCode("select * from something_that_fails; " +
      String.format("CREATE TABLE %s AS SELECT time, url, type FROM %s;",
                    aJob.getResultTable(), H2TestJobDaoImpl.testTableName));
    try {
      dao.createJob(aJob);
    } catch (Exception ex) { ex.printStackTrace(); }
    runRunnable(agentDriver);

    List<PlannedJob> expected = new ArrayList<PlannedJob>();
    expected.add(new PlannedJob(aJob, Utils.getCurrentTime()));

    assertEquals(expected, dao.getQueue());

    expected.clear();
    runRunnable(consumer);

    assertEquals(expected, dao.getQueue());

    List<String> actual = getResults(aJob);
    assertEquals(new ArrayList<String>(), actual);

    assertEquals(false, dao.showTables().contains(resultTable));
  }

  private void dropTable(String aTable) {
    try {
      dao.execute(String.format("DROP TABLE IF EXISTS %s", aTable));
    } catch (Exception ex) {
      ex.printStackTrace();
    }
  }

  private List<String> getResults(JobSpec aJob) {
    List<String> actual = new ArrayList<String>();
    try {
      Connection conn = dao.newConnection();
      Statement stat = conn.createStatement();
      ResultSet rs = stat.executeQuery(
        String.format("SELECT * FROM %s ORDER BY time DESC", aJob.getResultTable()));
      while (rs.next()) {
        String time = rs.getString("time");
        String url = rs.getString("url");
        String type = rs.getString("type");
        actual.add(String.format("%s\t%s\t%s", time, url, type));
      }
      rs.close();
      stat.close();
      conn.close();
    } catch (Exception ex) { /*ex.printStackTrace();*/ }
    return actual;
  }

  private boolean areAllFuturesDone(AgentConsumer consumer){
    boolean result = true;
    for (Entry<Long, CallableJob> i :
         consumer.getJobRuns(AgentConsumer.LIMIT_JOB_RUNS).entrySet()){
      if (!i.getValue().isDone()){
        result = false;
      }
    }
    return result;
  }

  @Test(timeout=2000)
  public void testJobRun() {
    JobSpec aJob = getTestJob("Testing Job Run", dao);
    aJob.setCode(String.format(
          "CREATE TABLE %s AS SELECT time, url, type FROM %s;",
          aJob.getResultTable(), H2TestJobDaoImpl.testTableName));
    dao.createJob(aJob);
    runRunnable(agentDriver);
    runRunnable(consumer);
    boolean allFuturesDone = false;
    while (!allFuturesDone) {
      allFuturesDone = areAllFuturesDone(consumer);
    }
    CallableJob value =
      consumer.getJobRuns(AgentConsumer.LIMIT_JOB_RUNS).get(new Long(1));
    String name = value.getPlannedJob().getJobSpec().getName();
    CallableJob cj = consumer.assembleCallableJob(value.getPlannedJob(), 1);
    consumer.submitJob(cj);

    CallableJob rerun =
      consumer.getJobRuns(AgentConsumer.LIMIT_JOB_RUNS).get(new Long(2));
    Assert.assertEquals(name, rerun.getPlannedJob().getJobSpec().getName());

    List<String> actual = getResults(aJob);
    List<String> expected = Arrays.asList("1374101000\thttp://huffingtonpost.com/\tping",
            "1374100900\thttp://huffingtonpost.com/\tclick",
            "1374100685\thttp://huffingtonpost.com/\tvanity");
    assertEquals(expected, actual);
    Collections.reverse(expected);
    List<Map<String,String>> expectedResults =
      new ArrayList<Map<String,String>>();
    for (String aRow : expected) {
      Map<String,String> aMap = new HashMap<String,String>();
      String[] values = aRow.split("\t");
      aMap.put("time".toUpperCase(), values[0]);
      aMap.put("url".toUpperCase(), values[1]);
      aMap.put("type".toUpperCase(), values[2]);
      expectedResults.add(aMap);
    }

    List<Map<String,String>> actualResults = null;
    try {
      actualResults = dao.getJobResults(aJob, 100);
    } catch (Exception ex) { ex.printStackTrace(); }
    assertEquals(expectedResults, actualResults);

    JobSpec actualJob = dao.getJob(aJob.getId());
    assertEquals(aJob, actualJob);

    dropTable(aJob.getResultTable());
  }

  @Test(timeout=10000)
  public void testBasicLarge() throws Exception {
    int count = 100;
    List<PlannedJob> expected = new ArrayList<>();
    for (int i = 1; i <= count; i++) {
      JobSpec aJob = getTestJob(String.valueOf(i), dao);
      try {
        dao.createJob(aJob);
        expected.add(new PlannedJob(aJob, Utils.getCurrentTime()));
      } catch (Exception ex) { ex.printStackTrace(); }
    }

    runRunnable(agentDriver);
    assertEquals(count, dao.getQueue().size());

    expected.clear();
    runRunnable(consumer);
    waitUntilJobsFinished(consumer, count);

    assertEquals(0, dao.getQueue().size());
    assertEquals(count, dao.getJobRuns(count).size());
    assertEquals(0, consumer.getFailedQueries(count).size());
    assertEquals(0,
      consumer.getPendingJobs(AgentConsumer.LIMIT_JOB_RUNS).size());
    assertEquals(count, consumer.getFinishedJobs(count).size());
    assertEquals(count, consumer.getSuccesfulQueries(count).size());
  }

  @Test
  public void testScriptRun() {
    JobSpec aJob = getTestScript("Chenoweth", dao);
    aJob.setCode("echo 'hi'; echo 'bye';");
    dao.createJob(aJob);
    runRunnable(agentDriver);
    runRunnable(consumer);
    waitUntilJobsFinished(consumer, 1);
    CallableJob actual =
      consumer.getJobRuns(AgentConsumer.LIMIT_JOB_RUNS).get(new Long(1));
    assertEquals("", actual.getExceptionMessage().get());
    assertEquals(true, actual.isSuccess());
  }

  @Test(timeout=2000)
  public void testScriptRunFail() {
    JobSpec aJob = getTestScript("Chenoweth", dao);
    String error = "error";
    aJob.setCode(String.format("echo '%s' >&2; exit 1;", error));
    dao.createJob(aJob);
    runRunnable(agentDriver);
    runRunnable(consumer);
    waitUntilJobsFinished(consumer, 1);
    CallableJob actual =
      consumer.getJobRuns(AgentConsumer.LIMIT_JOB_RUNS).get(new Long(1));
    assertEquals(false, actual.isSuccess());
    assertEquals(true, actual.isFailed());
    String expected = CallableScript.genErrorMessage(aJob, error+"\n");
    assertEquals(expected, actual.getExceptionMessage().get());
  }

  @Test(timeout=2000)
  public void testScriptReplace() {
    JobSpec aJob = getTestScript("Doug Lea", dao);
    String strFormat = "YYYYMMdd";
    DateTimeFormatter format = QueryReplaceUtil.makeDateTimeFormat(strFormat);
    DateTime now = Utils.getCurrentTime();

    String command = String.format("echo '${%s-1D} ${%s}' >&2; exit 1;",
      strFormat, strFormat);
    String error = String.format("%s %s",
      format.print(now.minusDays(1)), format.print(now));

    aJob.setCode(command);
    dao.createJob(aJob);
    runRunnable(agentDriver);
    runRunnable(consumer);
    waitUntilJobsFinished(consumer, 1);
    CallableJob actual =
      consumer.getJobRuns(AgentConsumer.LIMIT_JOB_RUNS).get(new Long(1));
    assertEquals(false, actual.isSuccess());
    assertEquals(true, actual.isFailed());
    String expected = CallableScript.genErrorMessage(aJob, error+"\n");
    assertEquals(expected, actual.getExceptionMessage().get());
  }

}
