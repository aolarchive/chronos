package com.huffingtonpost.chronos.agent;

import java.util.concurrent.Callable;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

import javax.mail.Session;

import org.apache.log4j.Logger;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.huffingtonpost.chronos.model.JobDao;
import com.huffingtonpost.chronos.model.JobSpec;
import com.huffingtonpost.chronos.model.MailInfo;
import com.huffingtonpost.chronos.model.PlannedJob;
import com.huffingtonpost.chronos.persist.BackendException;

public abstract class CallableJob implements Callable<Void> {

  public static Logger LOG = Logger.getLogger(CallableJob.class);

  @JsonIgnore
  protected JobDao dao;
  protected PlannedJob plannedJob;
  protected final AtomicLong start = new AtomicLong(0);
  protected final AtomicLong finish = new AtomicLong(0);
  protected AtomicBoolean success = new AtomicBoolean(false);
  protected Reporting reporting;
  protected String hostname;
  protected long jobId;
  protected String replacedCode;
  protected AtomicReference<String> exceptionMessage =
    new AtomicReference<>("");
  protected Session session;
  protected MailInfo mailInfo;
  protected int attemptNumber;
  
  public void begin() {
    String jobName = plannedJob.getJobSpec().getName();
    reporting.mark("chronos.query." + jobName + "." + "launched");
    start.set(System.currentTimeMillis());
    dao.updateJobRun(this);
  }

  protected abstract void callInternal() throws BackendException;

  @Override
  public abstract int hashCode();

  @Override
  public abstract boolean equals(Object obj);

  @Override
  public Void call() throws Exception {
    begin();
    try {
      callInternal();
    } catch (Exception ex) {
      handleException(ex);
    }
    end();
    return null;
  }

  protected void end() {
    String jobName = plannedJob.getJobSpec().getName();
    finish.set(System.currentTimeMillis());
    reporting.histogram("chronos.query." + jobName + "." + "querytime",
        finish.get() - start.get());
    dao.updateJobRun(this);
  }

  protected void handleException(Exception ex) {
    String jobName = plannedJob.getJobSpec().getName();
    LOG.error(ex);
    exceptionMessage.set(ex.getMessage());
    JobSpec spec = plannedJob.getJobSpec();
    if (spec.getStatusEmail() != null &&
        spec.getStatusEmail().size() > 0 &&
        !spec.getStatusEmail().get(0).equals("")) {
      for (String statusEmail : spec.getStatusEmail()) {
        MailInfo errMailInfo = new MailInfo(mailInfo.from, mailInfo.fromName, 
            statusEmail, String.format("%s creator", jobName));
        AgentConsumer.sendErrorReport(spec, replacedCode, ex,
            jobId, hostname, errMailInfo, session, attemptNumber);
      }
    } else {
      AgentConsumer.sendErrorReport(spec, replacedCode, ex,
          jobId, hostname, mailInfo, session, attemptNumber);
    }
    reporting.mark("chronos.query." + jobName + "." + "failed");
    success.set(false);
  }

  @JsonIgnore
  public boolean isRunning() {
    return start.get() > 0 && finish.get() == 0;
  }

  @JsonIgnore
  public boolean isDone() {
    return start.get() > 0 && finish.get() > 0;
  }

  public PlannedJob getPlannedJob() {
    return plannedJob;
  }

  public void setReplacedCode() {
    this.replacedCode = QueryReplaceUtil.replaceDateValues(
      plannedJob.getJobSpec().getCode(), plannedJob.getReplaceTime());
  }

  public AtomicLong getStart() {
    return start;
  }

  public AtomicLong getFinish() {
    return finish;
  }

  public AtomicBoolean getSuccess() {
    return success;
  }

  public AtomicReference<String> getExceptionMessage() {
    return exceptionMessage;
  }

  public void setJobId(Long jobId) {
    this.jobId = jobId;
  }

  public Long getJobId() {
    return jobId;
  }

  public int getAttemptNumber() {
    return attemptNumber;
  }
}
