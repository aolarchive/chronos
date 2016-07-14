package com.huffingtonpost.chronos.persist;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import javax.sql.DataSource;

import com.fasterxml.jackson.databind.DeserializationFeature;
import org.apache.log4j.Logger;
import org.h2.jdbcx.JdbcDataSource;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;
import com.fasterxml.jackson.databind.util.ISO8601DateFormat;
import com.fasterxml.jackson.datatype.joda.JodaModule;
import com.huffingtonpost.chronos.agent.CallableJob;
import com.huffingtonpost.chronos.agent.PolymorphicCallableJobMixin;
import com.huffingtonpost.chronos.model.JobSpec;
import com.huffingtonpost.chronos.model.JobSpec.JobType;
import com.huffingtonpost.chronos.model.PlannedJob;
import com.mysql.jdbc.jdbc2.optional.MysqlConnectionPoolDataSource;

public class WithSql implements WithBackend {

  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper()
    .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
    .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
    .registerModule(new JodaModule())
    .setDateFormat(new ISO8601DateFormat())
    .addMixIn(CallableJob.class, PolymorphicCallableJobMixin.class);
  
  private DataSource ds;

  private static Logger LOG = Logger.getLogger(WithSql.class);
  public static String jobRunTableName = "job_runs";
  public static String jobTableName = "jobs";
  public static String queueTableName = "torun_queue";

  public void initBackend() {
    try {
      initDbConnection();
    } catch (SQLException e) {
      e.printStackTrace();
      LOG.error("Couldn't init Sql connection", e);
      throw new RuntimeException(e);
    }
  }

  public void setDataSource(DataSource ds) {
    this.ds = ds;
  }
  
  public Connection newConnection() throws SQLException {
    if (ds instanceof JdbcDataSource) {
      return ((JdbcDataSource)ds).getPooledConnection().getConnection();
    }
    if (ds instanceof MysqlConnectionPoolDataSource) {
      return ((MysqlConnectionPoolDataSource)ds).getPooledConnection().getConnection();
    }
    return ds.getConnection();
  }

  private void initDbConnection() throws SQLException {
    Connection conn = newConnection();
    PreparedStatement jobRuns =
      conn.prepareStatement(String.format("CREATE TABLE IF NOT EXISTS %s "
        + "(id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, dt DATETIME, callable_job TEXT, "
        + "name TEXT, `code` TEXT, status INTEGER, exception TEXT,"
        + "start DATETIME, finish DATETIME,"
        + "callable_job_id BIGINT NOT NULL)", jobRunTableName));
    jobRuns.execute();
    jobRuns.close();

    PreparedStatement jobs =
      conn.prepareStatement(String.format("CREATE TABLE IF NOT EXISTS %s "
        + "(id BIGINT NOT NULL AUTO_INCREMENT, user VARCHAR(100), password VARCHAR(100),"
        + "name VARCHAR(100), description VARCHAR(250), jobType VARCHAR(100), "
        + "`code` TEXT, resultQuery TEXT, resultTable VARCHAR(100), "
        + "cronString VARCHAR(250), "
        + "driver VARCHAR(100), enabled BIT, "
        + "shouldRerun BIT, resultEmail TEXT, statusEmail TEXT, lastModified DATETIME,"
        + "PRIMARY KEY (id, lastModified))",
        jobTableName));
    jobs.execute();
    jobs.close();

    PreparedStatement queue =
      conn.prepareStatement(String.format("CREATE TABLE IF NOT EXISTS %s "
        + "(job_id BIGINT, job_lastModified DATETIME, replaceTime DATETIME, "
        + "insertTime DATETIME DEFAULT CURRENT_TIMESTAMP, "
        + "PRIMARY KEY (job_id, job_lastModified, replaceTime), "
        + "FOREIGN KEY (job_id, job_lastModified) "
        + "REFERENCES %s(id, lastModified) "
        + "ON DELETE CASCADE)",
        queueTableName, jobTableName));
    queue.execute();
    queue.close();

    conn.close();
  }
  
  private String objToString(Object obj) throws IOException {
    return OBJECT_MAPPER.writeValueAsString(obj);
  }

  public long createJobRun(DateTime dt, CallableJob cj) throws BackendException {
    long key = -1L;
    Connection conn = null;
    PreparedStatement stat = null;
    try {
      conn = newConnection();
      stat =
        conn.prepareStatement(
          String.format("INSERT INTO %s (dt, callable_job, name, `code`, status, exception, start, finish, callable_job_id) "
            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", jobRunTableName),
                        Statement.RETURN_GENERATED_KEYS);
      int i = 1;
      stat.setTimestamp(i++, new Timestamp(dt.getMillis()));
      stat.setString(i++, objToString(cj));
      stat.setString(i++, cj.getPlannedJob().getJobSpec().getName());
      stat.setString(i++, cj.getPlannedJob().getJobSpec().getCode());
      stat.setInt(i++, cj.getStatus().get());
      stat.setString(i++, cj.getExceptionMessage() != null ? cj.getExceptionMessage().get() : "");
      stat.setTimestamp(i++, new Timestamp(cj.getStart().get()));
      stat.setTimestamp(i++, new Timestamp(cj.getFinish().get()));
      stat.setLong(i++, cj.getPlannedJob().getJobSpec().getId());
      
      int rows = stat.executeUpdate();
      
      ResultSet rs = stat.getGeneratedKeys();
      if (rs != null && rs.next()) {
          key = rs.getLong(1);
      }
      rs.close();
      LOG.info(String.format("Rows updated: %d", rows));
    } catch (SQLException | IOException ex) {
      throw new BackendException(ex);
    } finally {
      try {
        if (stat != null) stat.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
      try {
        if (conn != null) conn.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
    }
    return key;
  }

  public void updateJobRun(DateTime dt, CallableJob cj) throws BackendException {
    Connection conn = null;
    PreparedStatement stat = null;
    try {
      conn = newConnection();
      stat =
        conn.prepareStatement(
          String.format("UPDATE %s SET dt = ?, callable_job = ?, name = ?, `code` = ?, status = ?, exception = ?,"
            + " start = ?, finish = ? WHERE id = ?", jobRunTableName));
      int i = 1;
      stat.setTimestamp(i++, new Timestamp(dt.getMillis()));
      stat.setString(i++, objToString(cj));
      stat.setString(i++, cj.getPlannedJob().getJobSpec().getName());
      stat.setString(i++, cj.getPlannedJob().getJobSpec().getCode());
      stat.setInt(i++, cj.getStatus().get());
      stat.setString(i++, cj.getExceptionMessage() != null ? cj.getExceptionMessage().get() : "");
      stat.setTimestamp(i++, new Timestamp(cj.getStart().get()));
      stat.setTimestamp(i++, new Timestamp(cj.getFinish().get()));
      stat.setLong(i++, cj.getJobId());
      int rows = stat.executeUpdate();
      LOG.info(String.format("Rows updated: %d", rows));
    } catch (SQLException | IOException ex) {
      throw new BackendException(ex);
    } finally {
      try {
        if (stat != null) stat.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
      try {
        if (conn != null) conn.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
    }
  }
  
  public Map<Long, CallableJob> getJobRuns(Long id, int limit) throws BackendException {
    Map<Long, CallableJob> toRet = new LinkedHashMap<>();
    Connection conn = null;
    PreparedStatement stat = null;
    try {
      conn = newConnection();
      String idWhere = "";
      if (id != null) {
        idWhere = "WHERE callable_job_id = ? ";
      }
      stat =
        conn.prepareStatement(
          String.format("SELECT * FROM %s "+idWhere+"ORDER BY dt DESC limit ?", jobRunTableName));
      int i = 1;
      if (id != null) {
        stat.setLong(i++, id);
      }
      stat.setInt(i++, limit);
      ResultSet rs = stat.executeQuery();
      while (rs.next()) {
        long anId = rs.getLong("id");
        CallableJob cj = OBJECT_MAPPER.readValue(
            rs.getString("callable_job").getBytes(), CallableJob.class);
        toRet.put(anId, cj);
      }
      rs.close();
    } catch (UnrecognizedPropertyException ex) {
      ex.printStackTrace();
      LOG.error("Exception when getting jobRuns: " + ex.getMessage());
    } catch (SQLException | IOException ex) {
      throw new BackendException(ex);
    } finally {
      try {
        if (stat != null) stat.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
      try {
        if (conn != null) conn.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
    }
    return toRet;
  }

  public Map<Long, CallableJob> getRunningJobs() throws BackendException {
    Map<Long, CallableJob> toRet = new LinkedHashMap<>();
    Connection conn = null;
    PreparedStatement stat = null;
    try {
      conn = newConnection();
      stat =
        conn.prepareStatement(
          String.format("SELECT * FROM %s WHERE start > ? AND finish = ? ORDER BY dt DESC", jobRunTableName));
      int i = 1;
      stat.setTimestamp(i++, new Timestamp(0L));
      stat.setTimestamp(i++, new Timestamp(0L));
      ResultSet rs = stat.executeQuery();
      while (rs.next()) {
        long id = rs.getLong("id");
        CallableJob cj = OBJECT_MAPPER.readValue(
            rs.getString("callable_job").getBytes(), CallableJob.class);
        cj.setJobId(id);
        toRet.put(id, cj);
      }
      rs.close();
    } catch (UnrecognizedPropertyException ex) {
      ex.printStackTrace();
      LOG.error("Exception when getting jobRuns: " + ex.getMessage());
    } catch (SQLException | IOException ex) {
      throw new BackendException(ex);
    } finally {
      try {
        if (stat != null) stat.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
      try {
        if (conn != null) conn.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
    }
    return toRet;
  }

  @Override
  public void close() {
  }

  @Override
  public long createJob(JobSpec job)
    throws BackendException {
    long key = -1L;
    Connection conn = null;
    PreparedStatement stat = null;
    try {
      conn = newConnection();
      stat =
        conn.prepareStatement(
          String.format("INSERT INTO %s (user, password, name, "
            + "description, jobType, `code`, resultQuery, resultTable, "
            + "cronString, driver, "
            + "enabled, shouldRerun, resultEmail, statusEmail, lastModified) "
            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", jobTableName),
            Statement.RETURN_GENERATED_KEYS);
      int i = 1;
      stat.setString(i++, job.getUser());
      stat.setString(i++, job.getPassword());
      stat.setString(i++, job.getName());
      stat.setString(i++, job.getDescription());
      stat.setString(i++, job.getType().toString());
      stat.setString(i++, job.getCode());
      stat.setString(i++, job.getResultQuery());
      stat.setString(i++, job.getResultTable());
      stat.setString(i++, job.getCronString());
      stat.setString(i++, job.getDriver());
      stat.setBoolean(i++, job.isEnabled());
      stat.setBoolean(i++, job.getShouldRerun());
      stat.setString(i++,
        objToString(job.getResultEmail()));
      stat.setString(i++,
        objToString(job.getStatusEmail()));
      Timestamp ts =
        job.getLastModified() == null ?
          new Timestamp(new DateTime().getMillis()) :
          new Timestamp(job.getLastModified().getMillis());
      stat.setTimestamp(i++, ts);
      
      int rows = stat.executeUpdate();
      ResultSet rs = stat.getGeneratedKeys();
      if (rs != null && rs.next()) {
          key = rs.getLong(1);
      }
      rs.close();
      LOG.info(String.format("Rows updated: %d", rows));
    } catch (SQLException | IOException ex) {
      throw new BackendException(ex);
    } finally {
      try {
        if (stat != null) stat.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
      try {
        if (conn != null) conn.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
    }
    return key;
  }

  @Override
  public void updateJob(JobSpec job)
    throws BackendException {
    Connection conn = null;
    PreparedStatement stat = null;
    try {
      conn = newConnection();
      stat =
        conn.prepareStatement(
          String.format("INSERT INTO %s (id, user, password, name, "
            + "description, jobType, `code`, resultQuery, resultTable, "
            + "cronString, driver, "
            + "enabled, shouldRerun, resultEmail, statusEmail, lastModified) "
            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ", jobTableName),
          Statement.RETURN_GENERATED_KEYS);
      int i = 1;
      stat.setLong(i++, job.getId());
      stat.setString(i++, job.getUser());
      stat.setString(i++, job.getPassword());
      stat.setString(i++, job.getName());
      stat.setString(i++, job.getDescription());
      stat.setString(i++, job.getType().toString());
      stat.setString(i++, job.getCode());
      stat.setString(i++, job.getResultQuery());
      stat.setString(i++, job.getResultTable());
      stat.setString(i++, job.getCronString());
      stat.setString(i++, job.getDriver());
      stat.setBoolean(i++, job.isEnabled());
      stat.setBoolean(i++, job.getShouldRerun());
      stat.setString(i++,
       objToString(job.getResultEmail()));
      stat.setString(i++,
       objToString(job.getStatusEmail()));
      Timestamp ts = new Timestamp(new DateTime().getMillis());
      stat.setTimestamp(i++, ts);

      int rows = stat.executeUpdate();
      LOG.info(String.format("Rows updated: %d", rows));
    } catch (SQLException | IOException ex) {
      throw new BackendException(ex);
    } finally {
      try {
        if (stat != null) stat.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
      try {
        if (conn != null) conn.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
    }
  }

  @Override
  public void deleteJob(long id)
    throws BackendException {
    Connection conn = null;
    PreparedStatement stat = null;
    try {
      conn = newConnection();
      stat =
        conn.prepareStatement(
          String.format("DELETE FROM %s WHERE id = ?", jobTableName));
      int i = 1;
      stat.setLong(i++, id);
      int rows = stat.executeUpdate();
      LOG.info(String.format("Rows deleted: %d", rows));
    } catch (SQLException ex) {
      throw new BackendException(ex);
    } finally {
      try {
        if (stat != null) stat.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
      try {
        if (conn != null) conn.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
    }
  }
  
  @SuppressWarnings("unchecked")
  private static JobSpec parseJob(ResultSet rs) throws SQLException {
    JobSpec job = new JobSpec();
    job.setId(rs.getLong("id"));
    job.setUser(rs.getString("user"));
    job.setPassword(rs.getString("password"));
    job.setName(rs.getString("name"));
    job.setDescription(rs.getString("description"));
    job.setType(JobType.valueOf(rs.getString("jobType")));
    job.setCode(rs.getString("code"));
    job.setResultQuery(rs.getString("resultQuery"));
    job.setResultTable(rs.getString("resultTable"));
    job.setCronString(rs.getString("cronString"));
    job.setDriver(rs.getString("driver"));
    job.setEnabled(rs.getBoolean("enabled"));
    job.setShouldRerun(rs.getBoolean("shouldRerun"));
    String resultEmail = rs.getString("resultEmail");
    try {
      job.setResultEmail((List<String>)
        OBJECT_MAPPER.readValue(resultEmail,
          new TypeReference<List<String>>(){}));
    } catch (IOException e) {
        LOG.error("Failed to parse resultEmail:", e);
    }
    String statusEmail = rs.getString("statusEmail");
    try {
      job.setStatusEmail((List<String>)
        OBJECT_MAPPER.readValue(statusEmail,
          new TypeReference<List<String>>(){}));
    } catch (IOException e) {
        LOG.error("Failed to parse statusEmail:", e);
    }
    DateTime lm =
      new DateTime(rs.getTimestamp("lastModified")).withZone(DateTimeZone.UTC);
    job.setLastModified(lm);
    return job;
  }

  @Override
  public JobSpec getJob(long id)
    throws BackendException {
    JobSpec toRet = null;
    Connection conn = null;
    PreparedStatement stat = null;
    try {
      conn = newConnection();
      stat =
        conn.prepareStatement(
          String.format("SELECT a.* FROM %s a " +
            "INNER JOIN " +
              "(SELECT id, MAX(lastModified) AS MaxModified " +
              "FROM %s WHERE id = ? " +
              "GROUP BY id) b " +
            "ON a.id = b.id " +
            "AND a.lastModified = b.MaxModified " +
            "ORDER BY a.id ASC", jobTableName, jobTableName));
      int i = 1;
      stat.setLong(i++, id);
      ResultSet rs = stat.executeQuery();
      if (rs != null && rs.next()) {
        toRet = parseJob(rs);
      }
      rs.close();
    } catch (SQLException ex) {
      throw new BackendException(ex);
    } finally {
      try {
        if (stat != null) stat.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
      try {
        if (conn != null) conn.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
    }
    return toRet;
  }

  @Override
  public List<JobSpec> getJobVersions(long id)
    throws BackendException {
    List<JobSpec> toRet = new ArrayList<>();
    Connection conn = null;
    PreparedStatement stat = null;
    try {
      conn = newConnection();
      stat =
        conn.prepareStatement(
          String.format("SELECT * FROM %s WHERE id = ?", jobTableName));
      int i = 1;
      stat.setLong(i++, id);
      ResultSet rs = stat.executeQuery();
      while (rs != null && rs.next()) {
        toRet.add(parseJob(rs));
      }
      rs.close();
    } catch (SQLException ex) {
      throw new BackendException(ex);
    } finally {
      try {
        if (stat != null) stat.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
      try {
        if (conn != null) conn.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
    }
    return toRet;
  }

  @Override
  public List<JobSpec> getJobs()
    throws BackendException {
    List<JobSpec> toRet = new ArrayList<>();
    Connection conn = null;
    PreparedStatement stat = null;
    try {
      conn = newConnection();
      stat =
        conn.prepareStatement(
          String.format("SELECT a.* FROM %s a " +
            "INNER JOIN " +
              "(SELECT id, MAX(lastModified) AS MaxModified " +
              "FROM %s " +
              "GROUP BY id) b " +
            "ON a.id = b.id " +
            "AND a.lastModified = b.MaxModified " +
            "ORDER BY a.name ASC", jobTableName, jobTableName));
      ResultSet rs = stat.executeQuery();
      while (rs != null && rs.next()) {
        toRet.add(parseJob(rs));
      }
      rs.close();
    } catch (SQLException ex) {
      throw new BackendException(ex);
    } finally {
      try {
        if (stat != null) stat.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
      try {
        if (conn != null) conn.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
    }
    return toRet;
  }
  
  public static PlannedJob parsePlannedJob(ResultSet rs) throws SQLException {
    DateTime replaceTime =
      new DateTime(rs.getTimestamp("replaceTime"))
        .withZone(DateTimeZone.UTC);
    return new PlannedJob(parseJob(rs), replaceTime);
  }

  public List<PlannedJob> getQueue(Long id) throws BackendException {
    List<PlannedJob> toRet = new ArrayList<>();
    Connection conn = null;
    PreparedStatement stat = null;
    try {
      conn = newConnection();
      String idPiece = "";
      if (id != null) {
        idPiece = "AND t2.id = ? ";
      }
      stat =
        conn.prepareStatement(
          String.format("SELECT * FROM %s AS t1 "
            + "JOIN %s t2 ON t1.job_id = t2.id "
            + "AND t1.job_lastModified = t2.lastModified "
            + idPiece
            + "ORDER BY t1.insertTime ASC",
            queueTableName, jobTableName));
      int i = 1;
      if (id != null) {
        stat.setLong(i++, id);
      }
      ResultSet rs = stat.executeQuery();
      while (rs != null && rs.next()) {
        PlannedJob pj = parsePlannedJob(rs);
        toRet.add(pj);
      }
      rs.close();
    } catch (SQLException ex) {
      throw new BackendException(ex);
    } finally {
      try {
        if (stat != null) stat.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
      try {
        if (conn != null) conn.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
    }
    return toRet;
  }

  public void addToQueue(PlannedJob aJob) throws BackendException {
    Connection conn = null;
    PreparedStatement stat = null;
    try {
      conn = newConnection();
      stat =
        conn.prepareStatement(
          String.format("INSERT INTO %s "
            + "(job_id, job_lastModified, replaceTime) "
            + "VALUES (?, ?, ?)", queueTableName),
            Statement.RETURN_GENERATED_KEYS);
      int i = 1;
      stat.setLong(i++, aJob.getJobSpec().getId());
      Timestamp lm =
        new Timestamp(aJob.getJobSpec().getLastModified().getMillis());
      stat.setTimestamp(i++, lm);
      Timestamp rt =
        new Timestamp(aJob.getReplaceTime().getMillis());
      stat.setTimestamp(i++, rt);
      
      int rows = stat.executeUpdate();
      LOG.info(String.format("Rows updated: %d", rows));
    } catch (SQLException ex) {
      throw new BackendException(ex);
    } finally {
      try {
        if (stat != null) stat.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
      try {
        if (conn != null) conn.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
    }
  }
  
  @Override
  public int deleteFromQueue(PlannedJob pj)
    throws BackendException {
    int toRet = 0;
    Connection conn = null;
    PreparedStatement stat = null;
    try {
      conn = newConnection();
      stat =
        conn.prepareStatement(
          String.format("DELETE FROM %s WHERE job_id = ? AND job_lastModified = ? AND replaceTime = ?",
                        queueTableName));
      int i = 1;
      stat.setLong(i++, pj.getJobSpec().getId());
      Timestamp lm =
        new Timestamp(pj.getJobSpec().getLastModified().getMillis());
      stat.setTimestamp(i++, lm);
      Timestamp rt =
        new Timestamp(pj.getReplaceTime().getMillis());
      stat.setTimestamp(i++, rt);
      toRet = stat.executeUpdate();
      LOG.info(String.format("Rows deleted: %d", toRet));
    } catch (SQLException ex) {
      throw new BackendException(ex);
    } finally {
      try {
        if (stat != null) stat.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
      try {
        if (conn != null) conn.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
    }
    return toRet;
  }

  public PlannedJob removeFromQueue() throws BackendException {
    PlannedJob toRet = null;
    Connection conn = null;
    PreparedStatement selStat = null;
    PreparedStatement delStat = null;
    try {
      conn = newConnection();
      conn.setAutoCommit(false);
      selStat =
        conn.prepareStatement(
          String.format("SELECT * FROM %s AS t1 "
            + "JOIN %s AS t2 ON t1.job_id = t2.id "
            + "AND t1.job_lastModified = t2.lastModified "
            + "ORDER BY t1.insertTime ASC LIMIT 1",
            queueTableName, jobTableName));

      ResultSet rs = selStat.executeQuery();
      if (rs != null && rs.next()) {
        toRet = parsePlannedJob(rs);
      }
      rs.close();
      delStat =
        conn.prepareStatement(
          String.format("DELETE FROM %s "
            + "WHERE job_id = ? AND job_lastModified = ? "
            + "AND replaceTime = ? LIMIT 1",
            queueTableName));

      if (toRet != null) {
        int i = 1;
        delStat.setLong(i++, toRet.getJobSpec().getId());
        Timestamp lm =
          new Timestamp(toRet.getJobSpec().getLastModified().getMillis());
        delStat.setTimestamp(i++, lm);
        Timestamp rt =
          new Timestamp(toRet.getReplaceTime().getMillis());
        delStat.setTimestamp(i++, rt);
        int rows = delStat.executeUpdate();
        LOG.info(String.format("Dequeued: %d", rows));
      }

      conn.commit();
    } catch (SQLException ex) {
      throw new BackendException(ex);
    } finally {
      try {
        if (selStat != null) selStat.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
      try {
        if (delStat != null) delStat.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
      try {
        if (conn != null) conn.close();
      } catch (SQLException e) {
        LOG.error(e);
      }
    }
    return toRet;
  }
}
