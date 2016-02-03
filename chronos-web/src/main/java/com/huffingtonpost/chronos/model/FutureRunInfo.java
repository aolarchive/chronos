package com.huffingtonpost.chronos.model;

import org.joda.time.DateTime;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;

public class FutureRunInfo implements Comparable<FutureRunInfo> {

  private String name;
  @JsonDeserialize(using=DateTimeDeserializer.class)
  private DateTime time;

  public FutureRunInfo(String name, DateTime time) {
    this.name = name;
    this.time = time;
  }

  public String getName() {
    return name;
  }

  public DateTime getTime() {
    return time;
  }

  /**
   * Ascending
   */
  @Override
  public int compareTo(FutureRunInfo o) {
    int startComparison = this.time.compareTo(o.time);
    return startComparison != 0 ? startComparison
                                : this.name.compareTo(o.name);
  }

  @Override
  public int hashCode() {
    final int prime = 31;
    int result = 1;
    result = prime * result + ((name == null) ? 0 : name.hashCode());
    result = prime * result + ((time == null) ? 0 : time.hashCode());
    return result;
  }

  @Override
  public boolean equals(Object obj) {
    if (this == obj)
      return true;
    if (obj == null)
      return false;
    if (getClass() != obj.getClass())
      return false;
    FutureRunInfo other = (FutureRunInfo) obj;
    if (name == null) {
      if (other.name != null)
        return false;
    } else if (!name.equals(other.name))
      return false;
    if (time == null) {
      if (other.time != null)
        return false;
    } else if (!time.equals(other.time))
      return false;
    return true;
  }

  @Override
  public String toString() {
    return "FutureRunInfo [name=" + name + ", time=" + time + "]";
  }

}

