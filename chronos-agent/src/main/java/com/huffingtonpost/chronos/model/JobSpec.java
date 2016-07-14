package com.huffingtonpost.chronos.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.apache.log4j.Logger;
import org.joda.time.DateTime;

public class JobSpec {
  static final long serialVersionUID = 3L;
  public static Logger LOG = Logger.getLogger(JobSpec.class);

  public enum JobType {
    Query("query"),
    Script("script");
    public final String name;
    JobType(String name) {
      this.name = name;
    }
  }

  private JobType jobType;
  private long id;
  private String user;
  private String password;
  private String name;
  private String description;
  private String code;
  private String resultTable;
  private String cronString;
  private String driver;
  private boolean enabled;
  private boolean shouldRerun = true;
  private String resultQuery;
  private List<String> resultEmail = new ArrayList<>();
  private List<String> statusEmail = new ArrayList<>();
  private DateTime lastModified;

  public JobSpec(){
    
  }
  
  public String makeResultQuery(int limit, String resultQuery) {
    return String.format(resultQuery, this.resultTable, limit);
  }
  
  @Override
  public String toString() {
    String rq = null;
    if (resultQuery != null) {
      rq = resultQuery.substring(0, resultQuery.length() > 100 ? 100 :
      resultQuery.length());
    }
    String c = null;
    if (code != null) {
      c = code.substring(0, code.length() > 100 ? 100 :
        code.length());
    }
    return new String("<JobSpec - id:" + id +
      ", name:" + name + ", description:" + description +
      ", code:" + c + ", jobType:" + jobType +
      ", resultQuery:" + rq +
      ", resultTable:" + resultTable + ", driver:" + driver +
      ", enabled:" + enabled + ", shouldRerun:" + shouldRerun +
      ", statusEmail:" + statusEmail + ", lastModified:" + lastModified + ">");
  }

  @Override
  public int hashCode() {
    return Objects.hash(name, description, code,
                        resultTable, cronString,
                        driver, enabled, shouldRerun,
                        resultQuery, resultEmail, statusEmail, jobType);
  }
  
  @Override
  public boolean equals(Object obj) {
    if (obj == this) {
      return true;
    }
    if (obj instanceof JobSpec) {
      JobSpec other = (JobSpec) obj;
      return Objects.equals(id, other.id) &&
             Objects.equals(name, other.name) &&
             Objects.equals(description, other.description) &&
             Objects.equals(code, other.code) &&
             Objects.equals(resultTable, other.resultTable) &&
             Objects.equals(cronString, other.cronString) &&
             Objects.equals(driver, other.driver) &&
             Objects.equals(enabled, other.enabled) &&
             Objects.equals(shouldRerun, other.shouldRerun) &&
             Objects.equals(resultQuery, other.resultQuery) &&
             Objects.equals(resultEmail, other.resultEmail) &&
             Objects.equals(statusEmail, other.statusEmail) &&
             Objects.equals(jobType, other.jobType)
             ;
    }
    return false;
  }

  public long getId() {
    return id;
  }

  public void setId(long id) {
    this.id = id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public String getCode() {
    return code;
  }

  public void setCode(String code) {
    this.code = code;
  }

  public String getResultTable() {
    return resultTable;
  }

  public void setResultTable(String resultTable) {
    this.resultTable = resultTable;
  }

  public String getCronString() {
    return cronString;
  }

  public void setCronString(String cronString) {
    this.cronString = cronString;
  }

  public String getDriver() {
    return driver;
  }

  public void setDriver(String driver) {
    this.driver = driver;
  }

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public boolean getShouldRerun() {
    return shouldRerun;
  }

  public void setShouldRerun(boolean shouldRerun) {
    this.shouldRerun = shouldRerun;
  }

  public String getResultQuery() {
    return resultQuery;
  }

  public void setResultQuery(String resultQuery) {
    this.resultQuery = resultQuery;
  }

  public List<String> getResultEmail() {
    return resultEmail;
  }

  public void setResultEmail(List<String> resultEmail) {
    if (resultEmail == null) {
      LOG.debug("Setting resultEmail to [] since null was provided");
      resultEmail = new ArrayList<String>();
    }
    this.resultEmail = resultEmail;
  }

  public List<String> getStatusEmail() {
    return statusEmail;
  }

  public void setStatusEmail(List<String> statusEmail) {
    if (statusEmail == null) {
      LOG.debug("Setting statusEmail to [] since null was provided");
      statusEmail = new ArrayList<String>();
    }
    this.statusEmail = statusEmail;
  }

  public DateTime getLastModified() {
    return lastModified;
  }

  public void setLastModified(DateTime lastModified) {
    this.lastModified = lastModified;
  }

  public String getUser() {
    return user;
  }

  public void setUser(String user) {
    if (user == null) {
      LOG.debug("Setting user to \"\" since null was provided");
      user = "";
    }
    this.user = user;
  }

  public String getPassword() {
    return password;
  }

  public void setPassword(String password) {
    if (password == null) {
      LOG.debug("Setting password to \"\" since null was provided");
      password = "";
    }
    this.password = password;
  }
  
  public void setType(JobType jobType) {
    this.jobType = jobType;
  }

  public JobType getType() {
    return jobType;
  }
}
