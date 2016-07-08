package com.huffingtonpost.chronos.agent;

import java.util.concurrent.atomic.AtomicLong;

import com.huffingtonpost.chronos.model.SupportedDriver;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.annotation.JsonSubTypes.Type;
import com.huffingtonpost.chronos.model.JobDao;
import com.huffingtonpost.chronos.model.MailInfo;
import com.huffingtonpost.chronos.model.PlannedJob;

import javax.mail.Session;

@JsonIgnoreProperties(ignoreUnknown=true)
@JsonTypeInfo(use=JsonTypeInfo.Id.NAME, include=JsonTypeInfo.As.PROPERTY, property="type")
@JsonSubTypes({
    @Type(value=SleepyCallableQuery.class, name="SleepyCallableQuery")
})
public class SleepyCallableQuery extends CallableQuery {

  private final int sleepFor;
  private final AtomicLong sleepyFinish = new AtomicLong(0);

  public SleepyCallableQuery(PlannedJob plannedJob, JobDao dao,
      Reporting reporting, String hostname, MailInfo mailInfo,
      Session session, SupportedDriver driver, int attemptNumber, int sleepFor) {
      super(plannedJob, dao, reporting,
          hostname, mailInfo, session, driver, attemptNumber);
      this.sleepFor = sleepFor;
  }

  @Override
  public Void call() throws Exception {
    try {
      super.call();
    } catch (Exception ex) {
      ex.printStackTrace();
    } finally {
      try {
        Thread.sleep(sleepFor);
      } catch (InterruptedException ex) {
        CallableQuery.LOG.debug("interrupted");
      } catch (Exception ex) { ex.printStackTrace(); }
      finish.set(System.currentTimeMillis());
      sleepyFinish.set(System.currentTimeMillis());
      dao.updateJobRun(this);
    }
    return null;
  }
  
  @Override
  protected void end() {
    // do nothing, we'll handle after we've slept
  }

  @Override
  public boolean isRunning() {
    return start.get() > 0 && sleepyFinish.get() == 0;
  }

  @Override
  public boolean isDone() {
    return start.get() > 0 && sleepyFinish.get() > 0;
  }

}
