package com.huffingtonpost.chronos.model;

import com.huffingtonpost.chronos.agent.CallableJob;
import com.huffingtonpost.chronos.persist.BackendException;

import javax.sql.DataSource;
import java.io.Closeable;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;

public interface JobDao extends Closeable {

  public void setDrivers(List<SupportedDriver> drivers);
  
  public void init() throws BackendException;

  public long createJob(JobSpec jobSpec);

  public void updateJob(JobSpec jobSpec);

  public void deleteJob(long id);
  
  public List<JobSpec> getJobs();
  
  public JobSpec getJob(long id);

  public List<Map<String, String>> getJobResults(JobSpec jobSpec, int limit)
          throws SQLException, InstantiationException, IllegalAccessException, ClassNotFoundException;

  public List<PlannedJob> getQueue(Long id);

  public void addToQueue(PlannedJob aJob);

  public PlannedJob removeFromQueue();

  public Map<Long, CallableJob> getJobRuns(Long id, int limit);
  
  public Map<Long, CallableJob> getRunningJobs();

  public long createJobRun(CallableJob cq);

  public void updateJobRun(CallableJob cq);

  public int cancelJob(PlannedJob pj);
  
  List<JobSpec> getJobVersions(long id);

  public void setDataSource(DataSource ds);

  List<JobSpec> getChildren(long id);

}
