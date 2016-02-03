package com.huffingtonpost.chronos.model;

import java.io.IOException;

import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.format.ISODateTimeFormat;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

public class DateTimeDeserializer extends JsonDeserializer<DateTime> {

  @Override
  public DateTime deserialize(JsonParser p, DeserializationContext ctxt)
    throws IOException, JsonProcessingException {
    String dt = p.getText();
    return ISODateTimeFormat.dateTimeParser()
            .parseDateTime(dt).withZone(DateTimeZone.UTC);
  }
}
