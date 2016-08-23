package com.huffingtonpost.chronos.servlet;

public class Messages {

  public static final String RESULTQUERY_MUST_HAVELIMIT =
    "if result query is specified the result query must contain the LIMIT";
  public static final String RESULTQUERY_MUST_HAVE_RESULT_EMAILS =
    "if result query is specified one or more result emails must be specified";
  public static final String JOB_NAME = "Job name must be specified";
  public static final String JOB_CRON_EMPTY =
    "Cron String cannot be empty, only null for a dependent job";
}
