package com.huffingtonpost.chronos.agent;

import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;

public class Utils {

  public static DateTime getCurrentTime() {
    return new DateTime().withZone(DateTimeZone.UTC)
      .withSecondOfMinute(0)
      .withMillisOfSecond(0);
  }
}
