package com.huffingtonpost.chronos.spring;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.util.ISO8601DateFormat;
import com.fasterxml.jackson.datatype.joda.JodaModule;

public class ChronosMapper extends ObjectMapper {

  private static final long serialVersionUID = 2L;

  public ChronosMapper() {
    this.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
      .registerModule(new JodaModule())
      .setDateFormat(new ISO8601DateFormat());
  }

}
