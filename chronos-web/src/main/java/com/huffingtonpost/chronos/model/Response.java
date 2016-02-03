package com.huffingtonpost.chronos.model;

import java.io.IOException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.util.ISO8601DateFormat;
import com.fasterxml.jackson.datatype.joda.JodaModule;

public class Response {
  private static ObjectMapper OM = new ObjectMapper()
    .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
    .registerModule(new JodaModule())
    .setDateFormat(new ISO8601DateFormat());
  public Object response;

  public Response(Object response) {
    this.response = response;
  }
  
  @Override
  public String toString() {
    try {
      return OM.writeValueAsString(this);
    } catch (IOException e) {
      e.printStackTrace();
      return null;
    }
  }
}
