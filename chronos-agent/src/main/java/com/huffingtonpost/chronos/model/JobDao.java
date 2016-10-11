package com.huffingtonpost.chronos.model;

import com.huffingtonpost.chronos.agent.CallableJob;
import com.huffingtonpost.chronos.persist.BackendException;

import javax.sql.DataSource;
import java.io.Closeable;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;

public interface JobDao extends Closeable {

  void setDrivers(List<SupportedDriver> drivers);
  
  void init() throws BackendException;

  long createJob(JobSpec jobSpec);

  void updateJob(JobSpec jobSpec);

  void deleteJob(long id);
  
  List<JobSpec> getJobs();
  
  JobSpec getJob(long id);

  List<Map<String, String>> getJobResults(JobSpec jobSpec, int limit)
   throws SQLException, InstantiationException, IllegalAccessException, ClassNotFoundException;

  List<PlannedJob> getQueue(Long id);

  void addToQueue(PlannedJob aJob);

  PlannedJob removeFromQueue();

  Map<Long, CallableJob> getJobRuns(Long id, int limit);
  
  Map<Long, CallableJob> getRunningJobs();

  long createJobRun(CallableJob cq);

  void updateJobRun(CallableJob cq);

  int cancelJob(PlannedJob pj);
  
  List<JobSpec> getJobVersions(long id);

  void setDataSource(DataSource ds);

  List<JobSpec> getChildren(long id);

  JobNode getTree(long id, String parent);

}
