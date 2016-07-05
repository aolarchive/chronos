package com.huffingtonpost.chronos.model;

import static org.junit.Assert.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import junit.framework.Assert;

import org.junit.Test;

import com.huffingtonpost.chronos.agent.CallableQuery;

public class TestCallableQuery {
  
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

}
