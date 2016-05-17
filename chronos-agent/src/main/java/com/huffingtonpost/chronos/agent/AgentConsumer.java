package com.huffingtonpost.chronos.agent;

import com.huffingtonpost.chronos.model.JobDao;
import com.huffingtonpost.chronos.model.JobSpec;
import com.huffingtonpost.chronos.model.MailInfo;
import com.huffingtonpost.chronos.model.PlannedJob;
import com.huffingtonpost.chronos.model.SupportedDriver;
import com.huffingtonpost.chronos.util.SendMail;

import org.apache.log4j.Logger;

import javax.mail.Session;

import java.io.IOException;
import java.util.*;
import java.util.Map.Entry;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

/**
 * This component pulls elements from the work queue and launches a
 * thread(Callable) to execute it.
 * AgentDriver -> Queue <- AgentConsumer -> [Callable & robRun entry]
 *
 */
public class AgentConsumer extends Stoppable {
  public static Logger LOG = Logger.getLogger(AgentConsumer.class);

  public int SLEEP_FOR = 10 * 1000;

  private final JobDao dao;
  private final Thread me;
  public final ThreadPoolExecutor executor;

  /**
   * rerunPool - this pool is used for handling the timeout (waitBeforeRetrySeconds)
   *             before jobs are enqueued
   */
  private final ExecutorService rerunPool;
  private final long waitBeforeRetrySeconds;
  public static int maxReruns;
  private static final List<PlannedJob> pendingReruns =
    Collections.synchronizedList(new ArrayList<PlannedJob>());

  private final String hostname;
  private final Reporting reporter;
  private final MailInfo mailInfo;
  private final Session session;
  private final List<SupportedDriver> drivers;
  private final int numOfConcurrentJobs;
  private final int numOfConcurrentReruns;
  private static boolean shouldSendErrorReports = true;
  public final static int LIMIT_JOB_RUNS = 100;
  
  public AgentConsumer(JobDao dao, Reporting reporter,
      String hostname, MailInfo mailInfo, Session session,
      List<SupportedDriver> drivers, int numOfConcurrentJobs,
      int numOfConcurrentReruns, int maxReruns, long waitBeforeRetrySeconds) {
    this.dao = dao;
    this.reporter = reporter;
    this.hostname = hostname;
    this.mailInfo = mailInfo;
    this.session = session;
    this.numOfConcurrentJobs = numOfConcurrentJobs;
    this.numOfConcurrentReruns = numOfConcurrentReruns;
    AgentConsumer.maxReruns = maxReruns;
    this.drivers = drivers;
    this.waitBeforeRetrySeconds = waitBeforeRetrySeconds;
    me = new Thread(this);
    rerunPool = Executors.newFixedThreadPool(this.numOfConcurrentReruns);
    executor = new ThreadPoolExecutor(this.numOfConcurrentJobs,
                                      this.numOfConcurrentJobs,
                                      0L, TimeUnit.MILLISECONDS,
                                      new LinkedBlockingQueue<Runnable>());
  }

  public void init() {
    LOG.info("Cleaning previously running jobs...");
    cleanupPreviouslyRunningJobs(dao, dao.getRunningJobs());
    LOG.info("Finished cleaning previously running jobs...");
    me.start();
  }

  public static void cleanupPreviouslyRunningJobs(
      JobDao dao, Map<Long, CallableJob> jobRuns) {
    for (Entry<Long, CallableJob> job : jobRuns.entrySet()) {
      CallableJob value = job.getValue();
      value.getFinish().set(System.currentTimeMillis());
      dao.updateJobRun(value);
    }
  }

  public void doRun() {
    List<PlannedJob> queue = dao.getQueue();
    boolean zeroInQueue = queue.size() == 0;
    int running = dao.getRunningJobs().size();
    boolean maxJobsRunning = running >= numOfConcurrentJobs;
    if (zeroInQueue || maxJobsRunning) {
      if (zeroInQueue) {
        LOG.debug("Job queue is empty. Sleeping...");
      }
      if (maxJobsRunning) {
        LOG.debug("Max # of concurrent jobs running. Sleeping...");
      }
      try {
        Thread.sleep(SLEEP_FOR);
      } catch (InterruptedException e) {
        LOG.error(e);
      }
    } else {
      PlannedJob toRun;
      while (executor.getActiveCount() < numOfConcurrentJobs &&
             (toRun = dao.removeFromQueue()) != null) {
        CallableJob cj = assembleCallableJob(toRun, 1);
        submitJob(cj);
      }
    }
    synchronized (pendingReruns) {
      handleReruns(
        new ArrayList<CallableJob>(getFailedQueries(LIMIT_JOB_RUNS).values()),
              AgentConsumer.maxReruns, this.waitBeforeRetrySeconds);
    }
  }

  private void handleReruns(final List<CallableJob> failed,
      final int maxReruns, final long waitBeforeRerun) {
    Collections.reverse(failed); // start with latest
    for (final CallableJob cj : failed) {
      final PlannedJob pj = cj.getPlannedJob();
      final String jobName = pj.getJobSpec().getName();
      if (pj.getJobSpec().getShouldRerun() == false) {
        continue;
      }

      boolean alreadyRan = false;
      synchronized (pendingReruns) {
        if (pendingReruns.contains(pj)) {
          alreadyRan = true;
        }
      }
      if (alreadyRan) {
        LOG.debug(String.format("Already submitted a version of: %s", jobName));
        continue;
      }
      CallableJob latest = getLatestMatching(pj, LIMIT_JOB_RUNS);
      final int attempt = latest.getAttemptNumber();
      boolean notMaxed = attempt < maxReruns;
      boolean latestFailed = latest.isDone() && !latest.isRunning() &&
        latest.isFailed();
      if (latest != null && latestFailed && notMaxed) {
        synchronized (pendingReruns) {
          pendingReruns.add(pj);
        }
        Thread aRerun = new Thread() {
          @Override
          public void run() {
            try {
              LOG.info(
                String.format("Sleeping for %d seconds before retrying %s",
                  waitBeforeRerun, jobName));
              Thread.sleep(1000L * waitBeforeRerun);
            } catch (InterruptedException e) {
              LOG.info("rerunning job was interrupted...");
            } finally {
              final CallableJob toResubmit =
                assembleCallableJob(pj, attempt + 1);
              submitJob(toResubmit);
              synchronized (pendingReruns) {
                pendingReruns.remove(pj);
              }
            }
          }
        };
        rerunPool.submit(aRerun);
      }
    }
  }

  public CallableJob assembleCallableJob(PlannedJob plannedJob,
      int attemptNumber) {
    switch(plannedJob.getJobSpec().getType()) {
      case Query: {
        SupportedDriver driver =
          SupportedDriver.getSupportedDriverFromString(
            plannedJob.getJobSpec().getDriver(), drivers);
        return new CallableQuery(plannedJob, dao, reporter,
          hostname, mailInfo, session, driver, attemptNumber);
      }
      case Script:
        return new CallableScript(plannedJob, dao, reporter, -1L,
          hostname, mailInfo, session, attemptNumber);
      default:
        throw new UnsupportedOperationException(
          String.format("Unknown jobtype...%s", plannedJob.getJobSpec().getType()));
    }
  }

  public void submitJob(final CallableJob cj) {
    dao.createJobRun(cj);
    final Future<Void> future = executor.submit(cj);
    reporter.mark("chronos.agentconsumer.submitted");
  }
  
  @Override
  public void run() {
    while (isAlive) {
      try {
        doRun();
      } catch (RuntimeException ex) {
        LOG.error("Exception when running consumer:", ex);
      }
    }
  }

  @Override
  public void close() throws IOException {
    super.close();
    try {
      rerunPool.shutdown();
      rerunPool.awaitTermination(1, TimeUnit.SECONDS);
      executor.shutdown();
      executor.awaitTermination(1, TimeUnit.SECONDS);
    } catch (InterruptedException e) {
      e.printStackTrace();
    }
    if (dao != null) {
      dao.close();
    }
  }

  public static void setShouldSendErrorReports(boolean shouldSend) {
    shouldSendErrorReports = shouldSend;
  }

  public static void sendErrorReport(JobSpec jobSpec, String query,
                                     Exception ex, Long myId, String hostname, MailInfo mailInfo,
                                     Session session, int attemptNumber) {
    if (!shouldSendErrorReports) {
      LOG.debug(String.format(
        "Not sending email for: %s since shouldSendErrorReports is false",
        ex.getMessage()));
      return;
    }
    String subject = String.format("Chronos job failed - rerun was scheduled - %s", jobSpec.getName());
    if (attemptNumber >= maxReruns){
      subject = String.format("Chronos - LAST ATTEMPT FAILED - %s", jobSpec.getName());
    }
    String messageFormat = "<h3>Attempt %s of %s</h3><br/>"
            + "<h3>Attempted query was:</h3><br/>"
            + "<pre>%s</pre>"
            + "<br/><h3>Error was:</h3><br/><pre>%s</pre><br/>"
            + "<br/><a href='http://%s:8080/api/queue?id=%s'>Rerun job</a><br/>";
    String messageBody = String.format(messageFormat, attemptNumber, maxReruns, query, ex.getMessage(),
        hostname, myId);
    SendMail.doSend(subject, messageBody, mailInfo, session);
  }

  synchronized public Map<Long, CallableJob> getFinishedJobs(int limit) {
    Map<Long, CallableJob> toRet = new TreeMap<>();
    Map<Long, CallableJob> runs = dao.getJobRuns(limit);
    for (Entry<Long, CallableJob> entry : runs.entrySet()) {
      Long key = entry.getKey();
      CallableJob value = entry.getValue();
      boolean isRunning = value.isRunning();
      boolean isDone = value.isDone();
      if (!isRunning && isDone) {
        toRet.put(key, value);
      }
    }
    return toRet;
  }

  public static boolean isJobFailed(CallableJob cj) {
    boolean isRunning = cj.isRunning();
    boolean isDone = cj.isDone();
    boolean isSuccess = cj.isSuccess();
    return !isRunning && isDone && !isSuccess;
  }

  synchronized public Map<Long, CallableJob> getFailedQueries(int limit) {
    Map<Long, CallableJob> toRet = new TreeMap<>();
    Map<Long, CallableJob> runs = dao.getJobRuns(limit);
    for (Entry<Long, CallableJob> entry : runs.entrySet()) {
      Long key = entry.getKey();
      CallableJob value = entry.getValue();
      if (isJobFailed(value)) {
        toRet.put(key, value);
      }
    }
    return toRet;
  }

  synchronized public Map<Long, CallableJob> getSuccesfulQueries(int limit) {
    Map<Long, CallableJob> toRet = new TreeMap<>();
    Map<Long, CallableJob> runs = dao.getJobRuns(limit);
    for (Entry<Long, CallableJob> entry : runs.entrySet()) {
      Long key = entry.getKey();
      CallableJob value = entry.getValue();
      boolean isRunning = value.isRunning();
      boolean isDone = value.isDone();
      boolean isSuccess = value.isSuccess();
      if (!isRunning && isDone && isSuccess) {
        toRet.put(key, value);
      }
    }
    return toRet;
  }
  
  synchronized public CallableJob getLatestMatching(PlannedJob pj, int limit) {
    Map<Long, CallableJob> toRet = new TreeMap<>();
    Map<Long, CallableJob> runs = dao.getJobRuns(limit);
    for (Entry<Long, CallableJob> entry : runs.entrySet()) {
      Long key = entry.getKey();
      CallableJob value = entry.getValue();
      if (value.getPlannedJob().equals(pj)) {
        toRet.put(key, value);
      }
    }
    List<CallableJob> queries = new ArrayList<>(toRet.values());
    if (queries.size() == 0) {
      return null;
    }
    Collections.reverse(queries);
    return queries.get(0);
  }

}
