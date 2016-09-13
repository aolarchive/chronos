package com.huffingtonpost.chronos.servlet;

import com.huffingtonpost.chronos.agent.AgentConsumer;
import com.huffingtonpost.chronos.agent.AgentDriver;
import com.huffingtonpost.chronos.agent.CallableJob;
import com.huffingtonpost.chronos.model.*;
import com.huffingtonpost.chronos.util.CronExpression;
import org.apache.log4j.Logger;
import org.apache.zookeeper.KeeperException;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.File;
import java.io.IOException;
import java.sql.SQLException;
import java.util.*;
import java.util.Map.Entry;

@Controller
@RequestMapping("/api")
public class ChronosController {

  public static Logger LOG = Logger.getLogger(ChronosController.class);
  private final JobDao jobDao;
  private final AgentDriver agentDriver;
  private final AgentConsumer agentConsumer;
  private final ArrayList<SupportedDriver> drivers;
  private final String reportRootPath;

  private static final Response SUCCESS = new Response("success");

  @Autowired
  public ChronosController(JobDao jobDao, AgentDriver agentDriver, AgentConsumer agentConsumer,
                           ArrayList<SupportedDriver> drivers, String reportRootPath) {
    this.jobDao = jobDao;
    this.agentDriver = agentDriver;
    this.agentConsumer = agentConsumer;
    this.drivers = drivers;
    this.reportRootPath = reportRootPath;
  }

  @ExceptionHandler(Exception.class)
  @ResponseBody
  public Response internalExceptionHandler(Exception  exception,
    HttpServletRequest request, HttpServletResponse response) {
    String message = exception.getMessage();
    LOG.error(message);
    if (exception instanceof NotFoundException) {
      response.setStatus(HttpServletResponse.SC_NOT_FOUND);
    } else {
      response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
    }
    return new Response(message);
  }

  @RequestMapping(value="/jobs", method=RequestMethod.GET)
  public @ResponseBody List<JobSpec> getJobs() {
    return jobDao.getJobs();
  }

  @RequestMapping(value="/jobs/history", method=RequestMethod.GET)
  public @ResponseBody List<CallableJob>
  history(@RequestParam(value="id", required=false) Long id,
          @RequestParam(value="limit", required=true, defaultValue="100") Integer limit) {
    Map<Long, CallableJob> toRet = jobDao.getJobRuns(id, limit);
    return new ArrayList<>(toRet.values());
  }

  @RequestMapping(value="/jobs/future", method=RequestMethod.GET)
  public @ResponseBody List<FutureRunInfo>
  future(@RequestParam(value="id", required=false) Long id,
         @RequestParam(value="limit", required=true, defaultValue="100") Integer limit) {
    List<FutureRunInfo> toRet = getJobFuture(id, limit);
    int endIdx = limit > toRet.size() ? toRet.size() : limit;
    return toRet.subList(0, endIdx);
  }

  public static DateTime calcNextRunTime(final DateTime from, JobSpec job) {
    String s = job.getCronString();
    if (s == null) {
      s = "* * * * *";
    }
    DateTime toRet = CronExpression.createWithoutSeconds(s)
            .nextTimeAfter(from);
    return toRet.withMillisOfSecond(0).withSecondOfMinute(0);
  }

  public void innerJobFuture(List<FutureRunInfo> toRet,
                             DateTime from, List<JobSpec> iterJobs) {
    for (JobSpec parent : iterJobs) {
      String jobName = parent.getName();
      DateTime nextRun = calcNextRunTime(from, parent);
      FutureRunInfo fri =
        new FutureRunInfo(jobName, nextRun);
      toRet.add(fri);
      List<JobSpec> children = jobDao.getChildren(parent.getId());
      innerJobFuture(toRet, nextRun, children);
    }
  }

  public List<FutureRunInfo> getJobFuture(Long id, int limit) {
    List<FutureRunInfo> toRet = new ArrayList<>();
    List<JobSpec> iterJobs;
    if (id == null) {
      iterJobs = jobDao.getJobs();
    } else {
      iterJobs = Arrays.asList(new JobSpec[]{ jobDao.getJob(id) });
    }

    if (iterJobs.size() == 0) {
      return toRet;
    }

    DateTime from = new DateTime().withZone(DateTimeZone.UTC);
    while (toRet.size() < limit) {
      innerJobFuture(toRet, from, iterJobs);
      Collections.sort(toRet);
      from = toRet.get(toRet.size() - 1).getTime();
    }
    return toRet;
  }

  @RequestMapping(value="/job/{id}", method=RequestMethod.GET)
  public @ResponseBody JobSpec getJob(@PathVariable("id") Long id)
      throws NotFoundException {
    JobSpec aJob = jobDao.getJob(id);
    if (aJob == null) {
      throw new NotFoundException(
        String.format("Job with id \"%d\" was not found", id));
    }
    return aJob;
  }

  @RequestMapping(value="/job/version/{id}", method=RequestMethod.GET)
  public @ResponseBody List<JobSpec> getJobVersions(@PathVariable("id") Long id)
      throws NotFoundException {
    List<JobSpec> versions = jobDao.getJobVersions(id);
    if (versions == null || versions.size() == 0) {
      throw new NotFoundException(
        String.format("Job versions for id \"%d\" were not found", id));
    }
    return versions;
  }

  @RequestMapping(value="/sources", method=RequestMethod.GET)
  public @ResponseBody ArrayList<SupportedDriver> getDataSources() {
    return drivers;
  }

  private void verifyJob(JobSpec aJob){
    if (aJob.getResultQuery() != null && !aJob.getResultQuery().isEmpty() &&
        !aJob.getResultQuery().toLowerCase().contains("limit")){
      throw new RuntimeException(Messages.RESULTQUERY_MUST_HAVELIMIT);
    }
    if (aJob.getResultQuery() != null ) {
      if (aJob.getResultEmail() == null) {
        throw new RuntimeException(Messages.RESULTQUERY_MUST_HAVE_RESULT_EMAILS);
      }
      if (aJob.getResultEmail().size() == 0) {
        throw new RuntimeException(Messages.RESULTQUERY_MUST_HAVE_RESULT_EMAILS);
      }
    }
    if (aJob.getName() == null || aJob.getName().isEmpty()) {
      throw new RuntimeException(Messages.JOB_NAME);
    }
    try {
      String cs = aJob.getCronString();
      if (cs == null) {
        return;
      } else if (cs.isEmpty()) {
        throw new RuntimeException(Messages.JOB_CRON_EMPTY);
      }
      CronExpression.createWithoutSeconds(aJob.getCronString());
    } catch (Exception ex) {
      throw new RuntimeException(ex.getMessage());
    }
  }

  public static Map<String, Long> assembleIdResp(long id) {
    Map<String, Long> aMap = new HashMap<>();
    aMap.put("id", id);
    return aMap;
  }

  @RequestMapping(value="/job", method=RequestMethod.POST)
  public @ResponseBody Map<String, Long> createJob(@RequestBody final JobSpec aJob) {
    verifyJob(aJob);
    long id = jobDao.createJob(aJob);
    return assembleIdResp(id);
  }

  @RequestMapping(value="/job/{id}", method=RequestMethod.PUT)
  public @ResponseBody Response updateJob(@PathVariable("id") Long id,
      @RequestBody final JobSpec aJob) throws NotFoundException {
    getJob(id);
    verifyJob(aJob);
    jobDao.updateJob(aJob);
    return SUCCESS;
  }

  @RequestMapping(value="/job/{id}", method=RequestMethod.DELETE)
  public @ResponseBody Response deleteJob(@PathVariable("id") Long id)
      throws NotFoundException {
    JobSpec aJob = getJob(id);
    jobDao.deleteJob(aJob.getId());
    return SUCCESS;
  }

  /**
   * Removed as an endpoint but leaving code here in case we need it again in
   * the future.
   */
  public @ResponseBody List<Map<String,String>> getJobResults(
      @RequestParam("id") Long id,
      @RequestParam("limit") int limit) throws NotFoundException {
    JobSpec aJob = getJob(id);
    try {
      return jobDao.getJobResults(aJob, limit);
    } catch (ClassNotFoundException | InstantiationException |
        IllegalAccessException | SQLException ex) {
      LOG.error(ex);
      throw new RuntimeException(ex.getMessage());
    }
  }

  @RequestMapping(value="/running", method=RequestMethod.GET)
  public @ResponseBody List<PlannedJob> getRunning(
      @RequestParam(value="id", required=false) Long id)
      throws IOException, KeeperException, InterruptedException {
    List<PlannedJob> toRet = new ArrayList<>();
    for (Entry<Long, CallableJob> entry :
         jobDao.getJobRuns(null, AgentConsumer.LIMIT_JOB_RUNS).entrySet()){
      boolean isDone = entry.getValue().isDone();
      if (!isDone){
        toRet.add(entry.getValue().getPlannedJob());
      }
    }
    return toRet;
  }

  @RequestMapping(value="/queue", method=RequestMethod.GET)
  public @ResponseBody List<PlannedJob> getQueue(
      @RequestParam(value="id", required=false) Long id)
      throws IOException, KeeperException, InterruptedException {
    return jobDao.getQueue(id);
  }

  @RequestMapping(value="/queue", method=RequestMethod.POST)
  public @ResponseBody Response queueJob(@RequestBody final PlannedJob aJob) {
    jobDao.addToQueue(aJob);
    return SUCCESS;
  }

  @RequestMapping(value="/queue", method=RequestMethod.DELETE)
  public @ResponseBody Response cancelJob(@RequestBody final PlannedJob aJob)
    throws NotFoundException {
    int num = jobDao.cancelJob(aJob);
    if (num == 1) {
      return SUCCESS;
    } else {
      throw new NotFoundException("Job was not found in queue");
    }
  }

  public List<String> getReportsList(String root, Long id) {
    String path;
    if (id == null) {
      path = root;
    } else {
      path = root + File.separator + String.valueOf(id);
    }
    File file = new File(path);
    if (file.exists()) {
      return Arrays.asList(file.list());
    } else {
      return null;
    }
  }

  @RequestMapping(value="/report-list", method=RequestMethod.GET)
  public @ResponseBody List<String> getReportsList(
    @RequestParam(value="id", required=false) Long id)
    throws NotFoundException {
    if (reportRootPath == null) {
      throw new NotFoundException("Report Root Path is not set, check your Chronos configuration.");
    }
    List<String> listing = getReportsList(reportRootPath, id);
    if (listing != null) {
      return listing;
    } else {
      throw new NotFoundException("Job id " + id + " was not found in report file system");
    }
  }
}
