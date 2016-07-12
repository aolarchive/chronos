package com.huffingtonpost.chronos.model;

import static com.huffingtonpost.chronos.agent.TestAgent.getTestJob;
import static org.junit.Assert.*;

import java.io.*;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import junit.framework.Assert;

import org.joda.time.DateTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;

import com.huffingtonpost.chronos.agent.CallableQuery;
import org.junit.rules.TemporaryFolder;

public class TestCallableQuery {

  @Rule
  public TemporaryFolder folder = new TemporaryFolder();

  
  @Test
  public void testCleanupQuery() {
    for (String s : new String[]{ "\r", "\n"}) {
      String q1 = "scat boo dee dat";
      String q2 = "badoo dat dat doo";
      String aQueryWithExtraSpace =
        String.format("%s%s%s;%s%s%s; ",
          s, q1, s,
          s, q2, s);
      String[] actual = CallableQuery.cleanupQuery(
        aQueryWithExtraSpace.split(CallableQuery.QUERY_SPLITTER));
      String[] expected = new String[]{ " " + q1 + " ", " " + q2 + " " };
      assertArrayEquals(expected, actual);
    }
  }
  
  @Test
  public void testResultEmail(){
    PersistentResultSet rs = new PersistentResultSet();
    rs.setColumnNames(Arrays.asList("a", "b"));
    rs.setColumnTypes(Arrays.asList("string", "string"));
    List<List<Object>> a = new ArrayList<>(); 
    List<Object> k = new ArrayList<>();
    k.add("a");k.add("b");
    List<Object> l = new ArrayList<>();
    l.add("c");l.add("d");
    a.add(k);
    a.add(l);
    rs.setData(a);
    JobSpec js = new JobSpec();
    StringBuilder s = CallableQuery.createInlineResults(rs, js);
    Assert.assertFalse(s.toString().equals(""));
  }

  @Test
  public void testWriteReportToLocal() throws IOException {
    //given
    String rootPath = folder.getRoot().getPath();
    DateTimeFormatter DT_FMT = DateTimeFormat.forPattern("yyyyMMddHH").withZoneUTC();
    CallableQuery callableQuery = new CallableQuery();
    PersistentResultSet result = new PersistentResultSet();
    result.setColumnNames(Arrays.asList("entry_id", "title", "social"));
    result.setColumnTypes(Arrays.asList("String", "String", "int"));
    result.setData(Arrays.asList(Arrays.asList((Object)"1", "Video", 90),
                                 Arrays.asList((Object)"2", "TV Shows", 500),
                                 Arrays.asList((Object)"3", "Facts", 1)));
    JobSpec jobSpec = getTestJob("ajob", new JobDaoImpl());
    DateTime dateTime = new DateTime();
    PlannedJob plannedJob = new PlannedJob(jobSpec, dateTime);
    String jobId = String.valueOf(jobSpec.getId());

    //when
    callableQuery.writeReportToLocal(result, rootPath, plannedJob);

    //expect
    FileReader resultReader = new FileReader(new File(rootPath + "/" + jobId + "/" + DT_FMT.print(dateTime)) + ".tsv");
    BufferedReader br = new BufferedReader(resultReader);
    Assert.assertEquals("entry_id\ttitle\tsocial\t", br.readLine());
    Assert.assertEquals("1\tVideo\t90\t",
                        br.readLine());
    Assert.assertEquals("2\tTV Shows\t500\t",
                        br.readLine());
    Assert.assertEquals("3\tFacts\t1\t",
                        br.readLine());
    br.close();
    resultReader.close();
  }
}
