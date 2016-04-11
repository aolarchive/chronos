package com.huffingtonpost.chronos.model;

import com.huffingtonpost.chronos.agent.CallableJob;
import com.huffingtonpost.chronos.agent.CallableQuery;
import com.huffingtonpost.chronos.persist.BackendException;
import com.huffingtonpost.chronos.persist.WithSql;

import org.apache.log4j.Logger;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;

import java.sql.*;
import java.util.*;

public class JobDaoImpl extends WithSql implements JobDao {

  public static Logger LOG = Logger.getLogger(JobDaoImpl.class);

  private List<SupportedDriver> drivers;

  @Override
  public void init() throws BackendException {
    initBackend();
    LOG.info("Backend initalized");
  }

  public void setDrivers(List<SupportedDriver> drivers) {
    this.drivers = drivers;
  }
  
  public long createJob(JobSpec jobSpec) {
    long id = -1L;
    try {
      id = super.createJob(jobSpec);
      jobSpec.setId(id);
      LOG.info("Created job:" + jobSpec.getName() + " with id: " + jobSpec.getId());
    } catch (BackendException e) {
      throw new RuntimeException("Exception when creating job:" + e.getMessage());
    }
    return id;
  }

  public void updateJob(JobSpec jobSpec) {
    try {
      super.updateJob(jobSpec);
      LOG.info("Updated job:" + jobSpec.getName());
    } catch (BackendException e) {
      throw new RuntimeException("Exception when updating job:" + e.getMessage());
    }
  }

  public void deleteJob(long id) {
    try {
      super.deleteJob(id);
      LOG.info("Deleted job:" + id);
    } catch (BackendException e) {
      throw new RuntimeException("Exception when deleting job:" + e.getMessage());
    }
  }

  public List<JobSpec> getJobs() {
    try {
      return super.getJobs();
    } catch (BackendException e) {
      throw new RuntimeException("Exception when getting jobs:" + e);
    }
  }

  public JobSpec getJob(long id) {
    try {
      return super.getJob(id);
    } catch (BackendException e) {
      throw new RuntimeException("Exception when getting job:" + e);
    }
  }

  public List<JobSpec> getJobVersions(long id) {
    try {
      return super.getJobVersions(id);
    } catch (BackendException e) {
      throw new RuntimeException("Exception when getting job versions:" + e);
    }
  }

  public List<Map<String,String>> getJobResults(JobSpec jobSpec, int limit)
    throws SQLException, InstantiationException, IllegalAccessException, ClassNotFoundException {
    if (limit < 1) {
      throw new RuntimeException("Limit must be positive silly!");
    }
    SupportedDriver d = SupportedDriver.getSupportedDriverFromString(jobSpec.getDriver(), drivers);
    Class.forName(d.getDriverName()).newInstance(); // load the database driver class
    Connection conn = DriverManager.getConnection(d.getConnectionUrl());
    Statement statement = conn.createStatement();
    ResultSet rs = null;
    List<Map<String,String>> toRet = new ArrayList<Map<String,String>>();
    try {
      rs = statement.executeQuery(
          jobSpec.makeResultQuery(limit, d.getResultQuery()));
      ResultSetMetaData rsmd = rs.getMetaData();
      int numberOfColumns = rsmd.getColumnCount();
      while (rs.next()) {
        Map<String, String> aRow = new HashMap<String, String>();
        for (int i = 1 ; i <= numberOfColumns ; i++) {
          String columnName = rsmd.getColumnName(i);
          String value = rs.getString(i);
          aRow.put(columnName, value);
        }
        toRet.add(aRow);
      }
    } catch (IllegalArgumentException ex) {
      LOG.error("Couldn't process result set: " + ex.getMessage());
    } finally {
      if (rs != null) {
        rs.close();
      }
    }
    return toRet;
  }

  public List<PlannedJob> getQueue() {
    try {
      List<PlannedJob> toRet = super.getQueue();
      return toRet;
    } catch (BackendException e) {
      throw new RuntimeException("Exception when getting queue:" + e.getMessage());
    }
  }

  public void addToQueue(PlannedJob aJob) {
    try {
      super.addToQueue(aJob);
      LOG.info("Queued job:" + aJob.getJobSpec().getName());
    } catch (BackendException e) {
      throw new RuntimeException("Exception when queueing job:" + e.getMessage());
    }
  }

  public PlannedJob removeFromQueue() {
    try {
      return super.removeFromQueue();
    } catch (BackendException e) {
      throw new RuntimeException("Exception when dequeueing job:" + e.getMessage());
    }
  }

  public Map<Long, CallableJob> getJobRuns(int limit) {
    try {
      return super.getJobRuns(limit);
    } catch (BackendException e) {
      throw new RuntimeException("Exception when getting jobRuns: " + e.getMessage());
    }
  }

  public long createJobRun(CallableJob cq) {
    try {
      long jobId = createJobRun(new DateTime().withZone(DateTimeZone.UTC), cq);
      cq.setJobId(jobId);
      LOG.debug("Created jobRun: " + cq.getJobId());
      return jobId;
    } catch (BackendException e) {
      throw new RuntimeException("Exception when updating jobRun: " + e.getMessage());
    }
  }

  public void updateJobRun(CallableJob cq) {
    try {
      updateJobRun(new DateTime().withZone(DateTimeZone.UTC), cq);
      LOG.debug("Updated jobRun: " + cq.getJobId());
    } catch (BackendException e) {
      throw new RuntimeException("Exception when updating jobRun: " + e.getMessage());
    }
  }

  public void cancelJob(PlannedJob pj) {
    try {
      deleteFromQueue(pj);
      LOG.debug("Canceled job: " + pj.getJobSpec().getId() +
        " with replace time: " + pj.getReplaceTime());
    } catch (BackendException e) {
      throw new RuntimeException("Exception when canceling job: " + e.getMessage());
    }
  }

}
