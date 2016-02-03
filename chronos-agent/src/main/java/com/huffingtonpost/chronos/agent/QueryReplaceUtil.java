package com.huffingtonpost.chronos.agent;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;

import com.huffingtonpost.chronos.model.DateMod;

public class QueryReplaceUtil {

  final static String DATE_REPLACE_REGEX = "\\$\\{([A-Za-z:T\\.]+)(-([0-9]+)([DHM]))?\\}";
  final static Pattern DATE_REPLACE_PATTERN = Pattern.compile(DATE_REPLACE_REGEX);
  
  /**
   * Replace date formats with the DateTime values passed in.
   *
   * Operations like "YYYYMMdd-1D" are supported for doing simple subtraction
   * on the passed in DateTime.
   *
   * See DateMod for supported modification values.
   *
   * @param aQuery - a String that's modified by doing replacement according to the formats specified
   * @param replaceWith - the DateTime moment for which the replacements are based off of
   */
  public static String replaceDateValues(String aQuery, DateTime replaceWith) {
    Matcher matcher = DATE_REPLACE_PATTERN.matcher(aQuery);
    while (matcher.find()) {
      final String format = matcher.group(1);
      DateTimeFormatter formatter = QueryReplaceUtil.makeDateTimeFormat(format);
      if (matcher.groupCount() > 3 &&
          matcher.group(3) != null && matcher.group(4) != null) {
        int count = Integer.valueOf(matcher.group(3));
        DateMod dm = DateMod.valueOf(matcher.group(4));
        DateTime toMod = new DateTime(replaceWith);
  
        if (dm.equals(DateMod.H)) {
          toMod = toMod.minusHours(count);
        } else if (dm.equals(DateMod.D)) {
          toMod = toMod.minusDays(count);
        } else if (dm.equals(DateMod.M)) {
          toMod = toMod.minusMonths(count);
        }
  
        aQuery = aQuery.replace(matcher.group(), formatter.print(toMod));
      } else { // no mod
        aQuery = aQuery.replace(matcher.group(), formatter.print(replaceWith));
      }
      matcher = DATE_REPLACE_PATTERN.matcher(aQuery);
    }
    return aQuery;
  }

  public static DateTimeFormatter makeDateTimeFormat(String format) {
    return DateTimeFormat.forPattern(format).withZone(DateTimeZone.UTC);
  }

}
