package com.huffingtonpost.chronos.servlet;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.Assert.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ConcurrentSkipListMap;

import javax.mail.Session;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.util.ISO8601DateFormat;
import com.fasterxml.jackson.datatype.joda.JodaModule;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.runners.MockitoJUnitRunner;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.huffingtonpost.chronos.agent.*;
import com.huffingtonpost.chronos.model.*;
import com.huffingtonpost.chronos.model.JobSpec.JobType;
import com.huffingtonpost.chronos.spring.ChronosMapper;
import com.huffingtonpost.chronos.util.H2TestUtil;

@RunWith(MockitoJUnitRunner.class)
public class TestChronosController {

  private String success = new Response("success").toString();

  ObjectMapper OM = new ObjectMapper()
    .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
    .registerModule(new JodaModule())
    .setDateFormat(new ISO8601DateFormat());

  private MockMvc mockMvc;
  private ChronosController controller;
  private Reporting reporting = new NoReporting();
  final int numOfConcurrentReruns = 10;
  final int maxReruns = 5;
  ArrayList<SupportedDriver> drivers = H2TestUtil.createDriverForTesting();

  @Mock
  private JobDao jobDao;

  private AgentDriver agentDriver;
  private AgentConsumer agentConsumer;

  @SuppressWarnings( "rawtypes" )
  @Before
  public void setUp() throws Exception{
    when(jobDao.getJobRuns(null, AgentConsumer.LIMIT_JOB_RUNS)).thenReturn(
      new ConcurrentSkipListMap<Long, CallableJob>());
    agentDriver  = new AgentDriver(jobDao, reporting);
    agentConsumer  =
      spy(new AgentConsumer(jobDao, reporting, "testing.hostname.com",
        new MailInfo("", "", "", ""),
        Session.getDefaultInstance(new Properties()),
        drivers, 10, numOfConcurrentReruns, maxReruns, 60, 1));
    controller = new ChronosController(jobDao, agentDriver, agentConsumer, drivers);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(new ChronosMapper());
    HttpMessageConverter[] messageConverters =
            new HttpMessageConverter[] {converter};

    this.mockMvc = MockMvcBuilders.standaloneSetup(controller)
      .setMessageConverters(messageConverters).build();
  }

  public static JobSpec getTestJob(String aName) {
    JobSpec aJob = new JobSpec();
    aJob.setName(aName);
    aJob.setUser("aUser");
    aJob.setPassword("");
    DateTime now = Utils.getCurrentTime();
    aJob.setStartMinute(now.getMinuteOfHour());
    aJob.setStartHour(now.getHourOfDay());
    aJob.setStartDay(now.getDayOfWeek());
    aJob.setResultTable("ARESULTTABLE");
    aJob.setCode("");
    aJob.setType(JobType.Query);
    return aJob;
  }

  @Test
  public void testGetDrivers() throws Exception{
    mockMvc.perform(get("/api/sources"))
            .andExpect(status().isOk())
            .andExpect(content().string("[{\"name\":\"H2\",\"driverName\":\"org.h2.Driver\"," +
                    "\"resultQuery\":\"SELECT * FROM %s limit %d\",\"connectionUrl\":\"jdbc:h2:mem:test;MODE=MySQL\"}]"));
  }

  @Test
  public void testGetJobs() throws Exception {
    mockMvc.perform(get("/api/jobs"))
      .andExpect(status().isOk())
      .andExpect(content().string("[]"));
    verify(jobDao, times(1)).getJobs();
    String name = "A report job";

    JobSpec aJob = getTestJob(name);
    aJob.setLastModified(new DateTime());
    List<JobSpec> expected = new ArrayList<>();
    expected.add(aJob);
    when(jobDao.getJobs()).thenReturn(expected);

    mockMvc.perform(get("/api/jobs"))
      .andExpect(status().isOk())
      .andExpect(content().string(OM.writeValueAsString(expected)));
    verify(jobDao, times(2)).getJobs();
  }

  @Test
  public void testGetJob() throws Exception {
    JobSpec aJob = getTestJob("Some job");
    when(jobDao.getJob(aJob.getId())).thenReturn(aJob);

    mockMvc.perform(get(String.format("/api/job/%s", aJob.getId())))
      .andExpect(status().isOk())
      .andExpect(content().string(OM.writeValueAsString(aJob)));

    verify(jobDao, times(1)).getJob(aJob.getId());
  }

  @Test
  public void testGetJobVersions() throws Exception {
    JobSpec aJob = getTestJob("Some job");
    List<JobSpec> expected = Arrays.asList(new JobSpec[]{aJob});
    when(jobDao.getJobVersions(aJob.getId()))
      .thenReturn(expected);

    mockMvc.perform(get(String.format("/api/job/version/%s", aJob.getId())))
      .andExpect(status().isOk())
      .andExpect(content().string(OM.writeValueAsString(expected)));

    verify(jobDao, times(1)).getJobVersions(aJob.getId());
  }

  @Test
  public void testGetJobByNameNotFound() throws Exception {
    JobSpec aJob = getTestJob("Some job");
    when(jobDao.getJob(aJob.getId())).thenReturn(null);

    mockMvc.perform(get(String.format("/api/job/%s", aJob.getId())))
      .andExpect(status().isNotFound())
      .andExpect(content().string(
        String.format("{\"response\":\"Job with id \\\"%d\\\" was not found\"}",
                      aJob.getId())));

    verify(jobDao, times(1)).getJob(aJob.getId());
  }

  @Test
  public void testCreateJob() throws Exception {
    JobSpec aJob = getTestJob("Some job");
    long id = 1L;
    when(jobDao.createJob(aJob)).thenReturn(id);
    MockHttpServletRequestBuilder request = post("/api/job")
      .contentType(MediaType.APPLICATION_JSON)
      .content(OM.writeValueAsBytes(aJob));
    mockMvc.perform(request)
      .andExpect(status().isOk())
      .andExpect(content().string(
         OM.writeValueAsString(ChronosController.assembleIdResp(id))));

    verify(jobDao, times(1)).createJob(aJob);
  }

  @Test
  public void testResultQuery() throws Exception{
    JobSpec aJob = getTestJob("bla");
    aJob.setResultQuery("select * FROM BLA");
    performAndExpectFailed(aJob, Messages.RESULTQUERY_MUST_HAVELIMIT);
  }

  @Ignore
  //TODO fix this
  public void testResultQueryEmails() throws Exception{
    JobSpec aJob = getTestJob("bla");
    aJob.setResultQuery("select * FROM BLA LIMIT 10");
    performAndExpectFailed(aJob, Messages.RESULTQUERY_MUST_HAVE_RESULT_EMAILS);
  }

  @Test
  public void testStartMinute() throws Exception{
    JobSpec aJob = getTestJob("bla");
    aJob.setStartMinute(61);
    performAndExpectFailed(aJob, Messages.START_MINUTE);
  }

  @Test
  public void testStartHour() throws Exception {
    JobSpec aJob = getTestJob("bla");
    aJob.setStartHour(99);
    performAndExpectFailed(aJob, Messages.START_HOUR);
  }

  @Test
  public void testResultQueryEmails2() throws Exception{
    JobSpec aJob = getTestJob("bla");
    aJob.setResultQuery("select * FROM BLA limit 10");
    aJob.setResultEmail(Arrays.asList("abc@def.com"));
    MockHttpServletRequestBuilder request = post("/api/job")
      .contentType(MediaType.APPLICATION_JSON)
      .content(OM.writeValueAsBytes(aJob));
    mockMvc.perform(request)
      .andExpect(status().is2xxSuccessful())
      .andExpect(content().string(
        OM.writeValueAsString(ChronosController.assembleIdResp(0L))));
  }

  private void performAndExpectFailed(JobSpec aJob, String message) throws
    Exception {
    MockHttpServletRequestBuilder request = post("/api/job")
            .contentType(MediaType.APPLICATION_JSON)
            .content(OM.writeValueAsBytes(aJob));
    mockMvc.perform(request)
    .andExpect(content().string(OM.writeValueAsString(new Response(message))))
    .andExpect(status().is5xxServerError());
  }

  @Test
  public void testCreateJobValidation() throws Exception {
    JobSpec aJob = new JobSpec();

    {
      MockHttpServletRequestBuilder request = post("/api/job")
        .contentType(MediaType.APPLICATION_JSON)
        .content(OM.writeValueAsBytes(aJob));
      mockMvc.perform(request)
        .andExpect(status().is5xxServerError());
    }

    aJob.setName("a name");
    {
      MockHttpServletRequestBuilder request = post("/api/job")
        .contentType(MediaType.APPLICATION_JSON)
        .content(OM.writeValueAsBytes(aJob));
      mockMvc.perform(request)
        .andExpect(status().is5xxServerError());
    }

    aJob.setUser(null);
    {
      MockHttpServletRequestBuilder request = post("/api/job")
        .contentType(MediaType.APPLICATION_JSON)
        .content(OM.writeValueAsBytes(aJob));
      mockMvc.perform(request)
        .andExpect(status().is5xxServerError());
    }

    aJob.setPassword(null);
    {
      MockHttpServletRequestBuilder request = post("/api/job")
        .contentType(MediaType.APPLICATION_JSON)
        .content(OM.writeValueAsBytes(aJob));
      mockMvc.perform(request)
        .andExpect(status().is5xxServerError());
    }

    aJob.setResultTable("someTable");
    {
      MockHttpServletRequestBuilder request = post("/api/job")
        .contentType(MediaType.APPLICATION_JSON)
        .content(OM.writeValueAsBytes(aJob));
      mockMvc.perform(request)
        .andExpect(status().is5xxServerError());
    }

    aJob.setStartMinute(0);
    {
      MockHttpServletRequestBuilder request = post("/api/job")
        .contentType(MediaType.APPLICATION_JSON)
        .content(OM.writeValueAsBytes(aJob));
      mockMvc.perform(request)
        .andExpect(status().is5xxServerError());
    }

    aJob.setStartHour(0);
    {
      MockHttpServletRequestBuilder request = post("/api/job")
              .contentType(MediaType.APPLICATION_JSON)
              .content(OM.writeValueAsBytes(aJob));
      mockMvc.perform(request)
        .andExpect(status().is5xxServerError());
    }

    // finally this one should pass
    aJob.setStartDay(1);
    {
      MockHttpServletRequestBuilder request = post("/api/job")
        .contentType(MediaType.APPLICATION_JSON)
        .content(OM.writeValueAsBytes(aJob));
      mockMvc.perform(request)
        .andExpect(status().isOk());
    }

    verify(jobDao, times(1)).createJob(aJob);
  }

  @Test
  public void testUpdateJob() throws Exception {
    JobSpec aJob = getTestJob("Some Job");

    when(jobDao.getJob(aJob.getId())).thenReturn(aJob);
    MockHttpServletRequestBuilder request = put(String.format("/api/job/%s", aJob.getId()))
      .contentType(MediaType.APPLICATION_JSON)
      .content(OM.writeValueAsBytes(aJob));
    mockMvc.perform(request)
      .andExpect(status().isOk())
      .andExpect(content().string(success));

    verify(jobDao, times(1)).getJob(aJob.getId());
    verify(jobDao, times(1)).updateJob(aJob);
  }

  @Test
  public void testDeleteJob() throws Exception {
    JobSpec aJob = getTestJob("Some Job");

    when(jobDao.getJob(aJob.getId())).thenReturn(aJob);
    MockHttpServletRequestBuilder request = delete(String.format("/api/job/%s", aJob.getId()));
    mockMvc.perform(request)
      .andExpect(status().isOk())
      .andExpect(content().string(success));

    verify(jobDao, times(1)).getJob(aJob.getId());
    verify(jobDao, times(1)).deleteJob(aJob.getId());
  }

  @Ignore
  public void testGetJobResults() throws Exception {
    int limit = 100;
    JobSpec aJob = getTestJob("Some Job");

    List<Map<String, String>> results = new ArrayList<Map<String, String>>();
    Map<String, String> aRow = new HashMap<String, String>();
    aRow.put("col1", "val1");
    aRow.put("col2", "val2");
    results.add(aRow);
    
    when(jobDao.getJob(aJob.getId())).thenReturn(aJob);
    when(jobDao.getJobResults(aJob, limit)).thenReturn(results);

    MockHttpServletRequestBuilder request =
      get(String.format("/api/job/results?name=%s&limit=%d", aJob.getName(), limit));
    mockMvc.perform(request)
      .andExpect(content().string(OM.writeValueAsString(results)))
      .andExpect(status().isOk());

    verify(jobDao, times(1)).getJob(aJob.getId());
    verify(jobDao, times(1)).getJobResults(aJob, limit);
  }

  @Test
  public void testGetQueue() throws Exception {
    List<PlannedJob> twoJobs = new ArrayList<>();
    for (int i = 0; i < 2; i++) {
      JobSpec j = new JobSpec();
      j.setName("job" + i);
      PlannedJob plannedJob = new PlannedJob(j, new DateTime());
      twoJobs.add(plannedJob);
    }
    when(jobDao.getQueue(null)).thenReturn(twoJobs);
    mockMvc.perform(get("/api/queue"))
      .andExpect(status().isOk())
      .andExpect(content().string(OM.writeValueAsString(twoJobs)));
  }

  @Test
  public void testGetQueueRunning() throws Exception {
    List<PlannedJob> twoJobs = new ArrayList<>();
    Map<Long, CallableJob> runs =
      new ConcurrentSkipListMap<>();
    Mockito.reset(agentConsumer);
    for (int i = 0; i < 2; i++) {
      JobSpec aJob = getTestJob("bleep bloop");
      aJob.setName("job" + i);
      PlannedJob plannedJob = new PlannedJob(aJob, new DateTime());
      twoJobs.add(plannedJob);
      when(jobDao.getJob(i)).thenReturn(aJob);

      CallableQuery cq =
        new CallableQuery(plannedJob, jobDao, reporting,
                          null, null, null, null, 1);
      runs.put(new Long(i), cq);
    }
    when(jobDao.getJobRuns(null, AgentConsumer.LIMIT_JOB_RUNS)).thenReturn(runs);
    mockMvc.perform(get("/api/running"))
      .andExpect(status().isOk())
      .andExpect(content().string(OM.writeValueAsString(twoJobs)));
  }

  @Test
  public void testQueueJob() throws Exception {
    PlannedJob aJob =
      new PlannedJob(getTestJob("Some Job"), Utils.getCurrentTime());

    MockHttpServletRequestBuilder request = post("/api/queue")
      .contentType(MediaType.APPLICATION_JSON)
      .content(OM.writeValueAsString(aJob));
    mockMvc.perform(request)
      .andExpect(status().isOk())
      .andExpect(content().string(success));

    verify(jobDao, times(1)).addToQueue(aJob);
  }

  @Test
  public void testJobHistory() throws Exception {
    JobSpec aJob = getTestJob("4 8 15 16 23 42");
    when(jobDao.getJob(aJob.getId())).thenReturn(aJob);
    PlannedJob plannedJob = new PlannedJob(aJob, new DateTime());
    CallableQuery cq =
      new CallableQuery(plannedJob, jobDao, reporting, null, null, null, null, 1);
    Map<Long, CallableJob> runs =
      new ConcurrentSkipListMap<>();
    runs.put(new Long(1), cq);

    when(jobDao.getJobRuns(aJob.getId(), AgentConsumer.LIMIT_JOB_RUNS)).thenReturn(runs);
    when(jobDao.getJobRuns(null, AgentConsumer.LIMIT_JOB_RUNS)).thenReturn(runs);

    List<CallableQuery> expected = new ArrayList<>();
    expected.add(cq);
    MockHttpServletRequestBuilder request =
      get(String.format("/api/jobs/history?id=%s", aJob.getId()));
    mockMvc.perform(request)
      .andExpect(content().string(OM.writeValueAsString(expected)))
      .andExpect(status().isOk());

    request =
      get("/api/jobs/history");
    mockMvc.perform(request)
      .andExpect(content().string(OM.writeValueAsString(expected)))
      .andExpect(status().isOk());

    Long anId = 4815162342L;
    expected.clear();
    request =
      get(String.format("/api/jobs/history?id=%s", anId));
    mockMvc.perform(request)
      .andExpect(content().string(OM.writeValueAsString(expected)))
      .andExpect(status().isOk());

    when(jobDao.getJobRuns(aJob.getId(), 1)).thenReturn(runs);
    expected.add(cq);
    request =
      get(String.format("/api/jobs/history?id=%s&limit=1", aJob.getId()));
    mockMvc.perform(request)
      .andExpect(content().string(OM.writeValueAsString(expected)))
      .andExpect(status().isOk());

    verify(jobDao, times(1)).getJobRuns(aJob.getId(), AgentConsumer.LIMIT_JOB_RUNS);
    verify(jobDao, times(1)).getJobRuns(anId, AgentConsumer.LIMIT_JOB_RUNS);
    verify(jobDao, times(1)).getJobRuns(null, AgentConsumer.LIMIT_JOB_RUNS);
    verify(jobDao, times(1)).getJobRuns(aJob.getId(), 1);
  }

  @Test
  public void testJobCalcNextRunTime() throws Exception {
    JobSpec aJob = getTestJob("Toussaint Louverture");

    {
      aJob.setInterval(JobSpec.Interval.Hourly);
      DateTime now = new DateTime().withMillisOfSecond(0)
        .withSecondOfMinute(0);
      aJob.setStartMinute(now.getMinuteOfHour());
      aJob.setStartHour(now.getHourOfDay());
      aJob.setStartDay(now.getDayOfWeek());

      DateTime actual = ChronosController.calcNextRunTime(now, aJob);
      DateTime expected = now.plusHours(1);

      assertEquals(expected, actual);
    }

    {
      aJob.setInterval(JobSpec.Interval.Daily);
      DateTime now = new DateTime().withMillisOfSecond(0)
              .withSecondOfMinute(0);
      aJob.setStartMinute(now.getMinuteOfHour());
      aJob.setStartHour(now.getHourOfDay());
      aJob.setStartDay(now.getDayOfWeek());

      DateTime actual = ChronosController.calcNextRunTime(now, aJob);
      DateTime expected = now.plusDays(1);

      assertEquals(expected, actual);
    }

    {
      aJob.setInterval(JobSpec.Interval.Weekly);
      DateTime now = new DateTime().withMillisOfSecond(0)
              .withSecondOfMinute(0);
      aJob.setStartMinute(now.getMinuteOfHour());
      aJob.setStartHour(now.getHourOfDay());
      aJob.setStartDay(now.getDayOfWeek());

      DateTime actual = ChronosController.calcNextRunTime(now, aJob);
      DateTime expected = now.plusDays(7);

      assertEquals(expected, actual);
    }

    {
      aJob.setInterval(JobSpec.Interval.Monthly);
      DateTime now = new DateTime().withMillisOfSecond(0)
              .withSecondOfMinute(0);
      aJob.setStartMinute(now.getMinuteOfHour());
      aJob.setStartHour(now.getHourOfDay());
      aJob.setStartDay(now.getDayOfWeek());

      DateTime actual = ChronosController.calcNextRunTime(now, aJob);
      DateTime expected = now.plusMonths(1)
        .withDayOfMonth(1);

      assertEquals(expected, actual);
    }
  }

  @Test
  public void testJobFuture() throws Exception {
    final DateTime now = new DateTime().withMillisOfSecond(0)
      .withSecondOfMinute(0).withZone(DateTimeZone.UTC);
    
    DateTime t1 = now.plusHours(1);
    JobSpec job1 = getTestJob("should be first");
    job1.setStartMinute(t1.getMinuteOfHour());
    job1.setStartHour(t1.getHourOfDay());
    job1.setStartDay(1);
    job1.setInterval(JobSpec.Interval.Daily);
    job1.setId(1L);

    JobSpec job2 = getTestJob("should be second");
    DateTime t2 = t1.plusMinutes(59);
    job2.setStartMinute(t2.getMinuteOfHour());
    job2.setStartHour(t2.getHourOfDay());
    job2.setStartDay(1);
    job2.setInterval(JobSpec.Interval.Daily);
    job2.setId(2L);

    List<JobSpec> jobs = new ArrayList<>();
    jobs.add(job2);
    jobs.add(job1);

    when(jobDao.getJobs()).thenReturn(jobs);

    List<FutureRunInfo> expected = new ArrayList<>();
    FutureRunInfo fri1 =
      new FutureRunInfo(job1.getName(),
        ChronosController.calcNextRunTime(now, job1));
    FutureRunInfo fri2 =
      new FutureRunInfo(job2.getName(),
        ChronosController.calcNextRunTime(now, job2));
    expected.add(fri1);
    expected.add(fri2);

    FutureRunInfo fri3 =
      new FutureRunInfo(job1.getName(),
        ChronosController.calcNextRunTime(fri2.getTime(), job1));
    FutureRunInfo fri4 =
      new FutureRunInfo(job2.getName(),
        ChronosController.calcNextRunTime(fri2.getTime(), job2));
    expected.add(fri3);
    expected.add(fri4);

    MockHttpServletRequestBuilder jobsFutureReq =
      get(String.format("/api/jobs/future?limit=%d", 4));
    mockMvc.perform(jobsFutureReq)
      .andExpect(content().string(OM.writeValueAsString(expected)))
      .andExpect(status().isOk());

    when(jobDao.getJob(job1.getId())).thenReturn(job1);
    List<FutureRunInfo> expectedId = new ArrayList<>();
    expectedId.add(fri1);
    expectedId.add(fri3);

    MockHttpServletRequestBuilder jobsFutureIdReq =
      get(String.format("/api/jobs/future?limit=%d&id=%d", 2, job1.getId()));
    mockMvc.perform(jobsFutureIdReq)
      .andExpect(content().string(OM.writeValueAsString(expectedId)))
      .andExpect(status().isOk());
  }

  @Test
  public void testCancelJob() throws Exception {
    PlannedJob aJob =
      new PlannedJob(getTestJob("Some Job"), Utils.getCurrentTime());

    when(jobDao.cancelJob(aJob)).thenReturn(1);
    MockHttpServletRequestBuilder request = delete("/api/queue")
      .contentType(MediaType.APPLICATION_JSON)
      .content(OM.writeValueAsString(aJob));
    mockMvc.perform(request)
      .andExpect(status().isOk())
      .andExpect(content().string(success));

    when(jobDao.cancelJob(aJob)).thenReturn(0);
    mockMvc.perform(request)
      .andExpect(status().isNotFound());

    verify(jobDao, times(2)).cancelJob(aJob);
  }
}
