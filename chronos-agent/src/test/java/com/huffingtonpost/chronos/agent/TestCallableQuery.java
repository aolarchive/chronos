package com.huffingtonpost.chronos.agent;

import com.huffingtonpost.chronos.model.*;
import com.huffingtonpost.chronos.util.H2TestUtil;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.powermock.api.mockito.PowerMockito;
import org.powermock.core.classloader.annotations.PowerMockIgnore;
import org.powermock.core.classloader.annotations.PrepareForTest;
import org.powermock.modules.junit4.PowerMockRunner;

import java.util.Arrays;
import java.util.List;

import static org.mockito.Mockito.when;

@PowerMockIgnore("javax.management.*")
@RunWith(PowerMockRunner.class)
@PrepareForTest({Utils.class})
public class TestCallableQuery {

  JobDao dao;
  List<SupportedDriver> drivers = H2TestUtil.createDriverForTesting();

  @Before
  public void setUp() throws Exception {
    dao = new H2TestJobDaoImpl();
    dao.setDrivers(drivers);
    dao.init();
    PowerMockito.mockStatic(Utils.class);
    when(Utils.getCurrentTime())
      .thenReturn(new DateTime(0).withZone(DateTimeZone.UTC));
  }

  @Test
  public void testReplacedReportQuery() {
    JobSpec aJob = TestAgent.getTestJob("Mark Rothko", dao);
    aJob.setResultQuery("select * from blah where dt=${YYYMMDDHH}");
    dao.createJob(aJob);
    PlannedJob pj = new PlannedJob(aJob, Utils.getCurrentTime());

    CallableQuery cq = new CallableQuery(pj, dao,
      null, "example.com", null, null,
      null, null, 1);

    String expected = "select * from blah where dt=1970010100";
    Assert.assertEquals(expected, cq.getReplacedReportQuery());
  }

  private static PersistentResultSet getPRS() {
    PersistentResultSet results = new PersistentResultSet();
    results.getColumnNames().add("Column 1");
    results.getColumnNames().add("Column 2");
    results.getColumnTypes().add("String");
    results.getColumnTypes().add("Int");
    results.getData().add(Arrays.asList(new Object[]{"a", 1}));
    results.getData().add(Arrays.asList(new Object[]{"b", 2}));
    return results;
  }

  @Test
  public void testCreateMessageContent() {
    JobSpec aJob = TestAgent.getTestJob("Broken Social Scene", dao);
    aJob.setResultQuery("select * from blah where dt=${YYYMMDDHH}");
    dao.createJob(aJob);
    PlannedJob pj = new PlannedJob(aJob, Utils.getCurrentTime());
    CallableQuery cq = new CallableQuery(pj, dao,
      null, "example.com", null, null,
      null, null, 1);

    PersistentResultSet results = getPRS();
    String expected = String.format("<br><table border='1' cellspacing='0' cellpadding='2' align='center' style='width:100%%'>\n" +
      "<tr>\n" +
      "<th style='padding: 5px'>%s</th>\n" +
      "<th style='padding: 5px'>%s</th>\n" +
      "</tr>\n" +
      "<tr>\n" +
      "<td style='padding: 5px'>%s</td>\n" +
      "<td style='padding: 5px'>%s</td>\n" +
      "</tr>\n" +
      "<tr>\n" +
      "<td style='padding: 5px'>%s</td>\n" +
      "<td style='padding: 5px'>%s</td>\n" +
      "</tr>\n" +
      "</table>\n" +
      "<br><pre> Query: %s</pre><br>Note: For brevity the first 500 rows are included in the email body.",
      results.getColumnNames().get(0), results.getColumnNames().get(1),
      results.getData().get(0).get(0), results.getData().get(0).get(1),
      results.getData().get(1).get(0), results.getData().get(1).get(1),
      cq.getReplacedReportQuery());
    String actual = CallableQuery.createMessageContent(results, aJob, cq.getReplacedReportQuery());
    Assert.assertEquals(expected, actual);
  }

  @Test
  public void testMakeAttachmentText() {
    PersistentResultSet results = getPRS();
    String actual =
      CallableQuery.makeAttachmentText(results);
    String expected = String.format("%s(%s)	%s(%s)\n"
      + "%s	%s\n"
      + "%s	%s\n",
      results.getColumnNames().get(0), results.getColumnTypes().get(0),
      results.getColumnNames().get(1), results.getColumnTypes().get(1),
      results.getData().get(0).get(0), results.getData().get(0).get(1),
      results.getData().get(1).get(0), results.getData().get(1).get(1));
    Assert.assertEquals(expected, actual);
  }
}
