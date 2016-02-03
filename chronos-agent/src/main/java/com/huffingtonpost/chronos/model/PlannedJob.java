package com.huffingtonpost.chronos.model;

import java.util.Objects;

import org.joda.time.DateTime;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;

public class PlannedJob implements Comparable<PlannedJob> {

  private JobSpec jobSpec;
  @JsonDeserialize(using=DateTimeDeserializer.class)
  private DateTime replaceTime;
  
  public PlannedJob() {
  }

  public PlannedJob(JobSpec jobSpec, DateTime replaceTime) {
    this.jobSpec = jobSpec;
    this.replaceTime = replaceTime;
  }

  public JobSpec getJobSpec() {
    return jobSpec;
  }

  public DateTime getReplaceTime() {
    return replaceTime;
  }

  @Override
  public int hashCode() {
    return Objects.hash(jobSpec, replaceTime);
  }

  @Override
  public boolean equals(Object obj) {
    if (obj == this) {
      return true;
    }
    if (obj instanceof PlannedJob) {
      PlannedJob other = (PlannedJob) obj;
      return Objects.equals(jobSpec, other.jobSpec) && 
             Objects.equals(replaceTime, other.replaceTime);
    }
    return false;
  }
  
  @Override
  public String toString() {
    return new String("<PlannedJob - jobSpec:" + jobSpec +
                      ", replaceTime:" + replaceTime + ">");
  }

  @Override
  public int compareTo(PlannedJob o) {
    int nameCompare = this.jobSpec.getName().compareTo(o.jobSpec.getName());
    return nameCompare != 0 ? nameCompare : this.replaceTime.compareTo(o.replaceTime);
  }
}
