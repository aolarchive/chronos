package com.huffingtonpost.chronos.persist;

import java.io.Closeable;
import java.util.List;
import java.util.Map;

import javax.sql.DataSource;

import org.joda.time.DateTime;

import com.huffingtonpost.chronos.agent.CallableJob;
import com.huffingtonpost.chronos.model.JobSpec;
import com.huffingtonpost.chronos.model.PlannedJob;

public interface WithBackend extends Closeable {
  
  public void initBackend();

  public long createJob(JobSpec job) throws BackendException;

  public void updateJob(JobSpec job) throws BackendException;
  
  public void deleteJob(long id) throws BackendException;
  
  public List<JobSpec> getJobs() throws BackendException;
  
  public JobSpec getJob(long id) throws BackendException;

  public Map<Long, CallableJob> getJobRuns(int limit) throws BackendException;

  public long createJobRun(DateTime dt, CallableJob cq) throws BackendException;

  public void updateJobRun(DateTime dt, CallableJob cq) throws BackendException;

  List<JobSpec> getJobVersions(long id) throws BackendException;

  public void setDataSource(DataSource ds);
  
  public List<PlannedJob> getQueue() throws BackendException;
  
  public void addToQueue(PlannedJob aJob) throws BackendException;

  public PlannedJob removeFromQueue() throws BackendException;
}
