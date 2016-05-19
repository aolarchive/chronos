package com.huffingtonpost.chronos.agent;

import javax.mail.Session;

import com.huffingtonpost.chronos.model.JobDao;
import com.huffingtonpost.chronos.model.JobSpec;
import com.huffingtonpost.chronos.model.MailInfo;
import com.huffingtonpost.chronos.model.PlannedJob;
import com.huffingtonpost.chronos.persist.BackendException;

public class CallableScript extends CallableJob {
  
  private BashRunner runner;

  public CallableScript() {
  }

  public CallableScript(PlannedJob plannedJob, JobDao dao,
                       Reporting reporting, long jobId, String hostname,
                       MailInfo mailInfo, Session session,
                       int attemptNumber) {
    this.plannedJob = plannedJob;
    this.dao = dao;
    this.reporting = reporting;
    this.jobId = jobId;
    this.mailInfo = mailInfo;
    this.session = session;
    this.attemptNumber = attemptNumber;
    setReplacedCode();
    runner = new BashRunner();
    runner.init();
  }

  public static String genErrorMessage(JobSpec aJob, String error) {
    String jobName = aJob.getName();
    String aMessage = String.format("Error when running script %s: %s",
      jobName, error);
    return aMessage;
  }

  @Override
  protected void callInternal()
    throws BackendException {
    String jobName = plannedJob.getJobSpec().getName();
    String aCommand = replacedCode;
    try {
      int exitCode = runner.exec(aCommand);
      if (exitCode == BashRunner.SUCCESS) {
        reporting.mark("chronos.query." + jobName + "." + "passed");
        setStatus(0);
      } else {
        String error = runner.getError();
        String aMessage = genErrorMessage(plannedJob.getJobSpec(), error);
        handleException(new Exception(aMessage));
      }
    } catch (BackendException ex) {
      handleException(ex);
    } finally {
      runner.clean();
    }
  }

  @Override
  public String toString() {
    StringBuilder builder = new StringBuilder();
    builder.append("CallableScript [plannedJob=");
    builder.append(plannedJob);
    builder.append(", start=");
    builder.append(start);
    builder.append(", finish=");
    builder.append(finish);
    builder.append(", status=");
    builder.append(status);
    builder.append(", jobId=");
    builder.append(jobId);
    builder.append(", attemptNumber=");
    builder.append(attemptNumber);
    builder.append("]");
    return builder.toString();
  }

  @Override
  public int hashCode() {
    final int prime = 31;
    int result = 1;
    result = prime * result + attemptNumber;
    result = prime * result + ((finish == null) ? 0 : finish.hashCode());
    result = prime * result + (int)jobId;
    result = prime * result + ((plannedJob == null) ? 0 : plannedJob.hashCode());
    result = prime * result + ((start == null) ? 0 : start.hashCode());
    result = prime * result + ((status == null) ? 0 : status.hashCode());
    return result;
  }

  @Override
  public boolean equals(Object obj) {
    if (this == obj) {
      return true;
    }
    if (obj == null) {
      return false;
    }
    if (getClass() != obj.getClass()) {
      return false;
    }
    CallableScript other = (CallableScript) obj;
    if (attemptNumber != other.attemptNumber) {
      return false;
    }
    if (finish == null) {
      if (other.finish != null) {
        return false;
      }
    } else if (finish.get() != other.finish.get()) {
      return false;
    }
    if (jobId != other.jobId) {
      return false;
    }
    if (plannedJob == null) {
      if (other.plannedJob != null) {
        return false;
      }
    } else if (!plannedJob.equals(other.plannedJob)) {
      return false;
    }
    if (start == null) {
      if (other.start != null) {
        return false;
      }
    } else if (start.get() != other.start.get()) {
      return false;
    }
    if (status == null) {
      if (other.status != null) {
        return false;
      }
    } else if (status.get() != other.status.get()) {
      return false;
    }
    return true;
  }

}
