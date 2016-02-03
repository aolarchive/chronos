package com.huffingtonpost.chronos.servlet;

import org.joda.time.DateTimeConstants;

public class Messages {

  public static final String RESULTQUERY_MUST_HAVELIMIT =
    "if result query is specified the result query must contain the LIMIT";
  public static final String RESULTQUERY_MUST_HAVE_RESULT_EMAILS =
    "if result query is specified one or more result emails must be specified";
  public static final String JOB_NAME = "Job name must be specified";
  public static final String START_MINUTE =
    "start minute must be between 0 (inclusive) and 60 (exclusive)";
  public static final String START_HOUR =
    "start hour must be between 0 (inclusive) and 23 (inclusive)";
  public static final String START_DAY =
    String.format("start day must be between %d-%d", DateTimeConstants.MONDAY, DateTimeConstants.SUNDAY);
}
