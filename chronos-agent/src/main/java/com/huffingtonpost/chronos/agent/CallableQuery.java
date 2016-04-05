package com.huffingtonpost.chronos.agent;

import com.google.common.annotations.VisibleForTesting;
import com.huffingtonpost.chronos.model.*;
import com.huffingtonpost.chronos.persist.BackendException;

import org.apache.log4j.Logger;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;

import javax.activation.DataHandler;
import javax.activation.DataSource;
import javax.mail.*;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;
import javax.mail.util.ByteArrayDataSource;

import java.io.IOException;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;

public class CallableQuery extends CallableJob implements Callable<Void>  {

  public static Logger LOG = Logger.getLogger(CallableQuery.class);
  private static DateTimeFormatter DT_FMT =
    DateTimeFormat.forPattern("yyMMddHH").withZoneUTC();

  private String [] parts;
  private String replacedReportQuery;
  private SupportedDriver driver;

  public static final String QUERY_SPLITTER = ";";
  private static final long MAX_RESULTS_IN_BODY = 500;
  
  public CallableQuery() {
  }

  public CallableQuery(PlannedJob plannedJob, JobDao dao,
                       Reporting reporting, String hostname,
                       MailInfo mailInfo, Session session,
                       SupportedDriver driver, int attemptNumber) {
    this.plannedJob = plannedJob;
    this.dao = dao;
    this.reporting = reporting;
    this.hostname = hostname;
    this.mailInfo = mailInfo;
    this.session = session;
    this.driver = driver;
    this.attemptNumber = attemptNumber;
    setReplacedCode();
    if (plannedJob.getJobSpec().getResultQuery() != null) {
      this.replacedReportQuery =
        QueryReplaceUtil.replaceDateValues(
          plannedJob.getJobSpec().getResultQuery(),
          plannedJob.getReplaceTime());
    } else {
      this.replacedReportQuery = null;
    }
    this.parts = cleanupQuery(replacedCode.split(QUERY_SPLITTER));
  }
  
  public static String[] cleanupQuery(String[] parts) {
    List<String> cleaned = new ArrayList<String>();
    for (int i = 0; i < parts.length; i++) {
      String clean = parts[i].replace('\n', ' ').replace('\r', ' ');
      if (!clean.trim().isEmpty()) {
        cleaned.add(clean);
      }
    }
    return cleaned.toArray(new String[cleaned.size()]);
  }

  @Override
  protected void callInternal() throws BackendException {
    JobSpec currJob = plannedJob.getJobSpec();
    String jobName = currJob.getName();
    try (Connection conn = getConnectionForJobSpec(currJob)) {
      int step = 0;
      try (Statement statement = conn.createStatement()) {
        while (step < parts.length) {
          doStep(currJob, parts[step], statement);
          step++;
        }
      } catch (SQLException ex) {
        throw new BackendException(ex);
      }
      if (replacedReportQuery != null && !replacedReportQuery.isEmpty()) {
        PersistentResultSet results = doReportStep(conn, currJob, replacedReportQuery);
        String content = createMessageContent (results, currJob);
        DataSource attachment = createAttachment(results, currJob);
        sendEmail(mailInfo, attachment, content, currJob);
      }
    } catch (Exception ex) {
      throw new RuntimeException(ex);
    }
    reporting.mark("chronos.query." + jobName + "." + "passed");
    setStatus(0);
  }

  private void sendEmail(MailInfo info, DataSource attachment, String body, JobSpec currJob) {
    Message message = new MimeMessage(session);
    List<Address> to = new ArrayList<>();
    try {
      message.setFrom(new InternetAddress(info.from));
      for (String s : currJob.getResultEmail()) {
        for (Address ad : InternetAddress.parse(s)) {
          to.add(ad);
        }
      }
      message.setRecipients(Message.RecipientType.TO, (Address[])
        to.toArray(new Address[]{}));
      message.setSubject("Chronos " + currJob.getName());
      Multipart multipart = new MimeMultipart();
      {
        BodyPart messageBodyPart = new MimeBodyPart();
        messageBodyPart.setContent(body, "text/html");
        multipart.addBodyPart(messageBodyPart);
      }
      {
        MimeBodyPart attachmentPart = new MimeBodyPart();
        attachmentPart.setDataHandler(new DataHandler(attachment));
        String fileName = String.format("%s-%s.tsv",
            currJob.getName(), DT_FMT.print(plannedJob.getReplaceTime()));
        attachmentPart.setFileName(fileName);
        multipart.addBodyPart(attachmentPart);
      }
      message.setContent(multipart);
      Transport.send(message);
      LOG.info("Sent email to: " + to);
    } catch (MessagingException e) {
      throw new RuntimeException(e);
    }
  }

  private String createMessageContent(PersistentResultSet results, JobSpec spec) {
    StringBuilder sb = new StringBuilder();
    sb.append("<br>");
    sb.append(createInlineResults(results, spec));
    sb.append("<br>");
    sb.append("<pre> Query: " + replacedReportQuery + "</pre>");
    sb.append("<br>");
    sb.append("Note: For brevity the first " + MAX_RESULTS_IN_BODY + " rows are included in the email body.");
    return sb.toString();
  }

  @VisibleForTesting
  public static StringBuilder createInlineResults(PersistentResultSet results, JobSpec spec) {
    StringBuilder sb = new StringBuilder();
    sb.append("<table border='1' cellspacing='0' cellpadding='2' align='center' style='width:100%'>\n");
      sb.append("<tr>\n");
      for (int i = 0 ; i < results.getColumnNames().size() ; i++) {
        sb.append("<th style='padding: 5px'>");
        sb.append(results.getColumnNames().get(i));
        sb.append("</th>\n");
      }
      sb.append("</tr>\n");
      long rowsInEmail = results.getData().size() > MAX_RESULTS_IN_BODY ?
              MAX_RESULTS_IN_BODY : results.getData().size();
      for (int i = 0 ; i < rowsInEmail ; i++) {
        sb.append("<tr>\n");
        for (int j = 0 ; j < results.getData().get(i).size() ; j++) {
          sb.append("<td style='padding: 5px'>");
          sb.append(results.getData().get(i).get(j));
          sb.append("</td>\n");
        }
        sb.append("</tr>\n");
      } 
    sb.append("</table>\n");
    return sb;
  }
  
  private DataSource createAttachment(PersistentResultSet results, JobSpec spec) {
    StringBuilder sb = new StringBuilder();
    for (int i = 0 ; i < results.getColumnNames().size() ; i++) {
      sb.append(results.getColumnNames().get(i))
      .append("(").append(results.getColumnTypes().get(i)).append(")");
      if (i != results.getColumnNames().size() - 1) {
        sb.append('\t');
      }
    }
    sb.append('\n');
    for (int i = 0 ; i < results.getData().size() ; i++) {
      for (int j = 0 ; j < results.getData().get(i).size() ; j++) {
        sb.append(results.getData().get(i).get(j));
        if (j != results.getData().get(i).size() - 1) {
          sb.append('\t');
        }
      }
      sb.append('\n');
    }
    try {
      DataSource source = new ByteArrayDataSource(sb.toString(), "text/tab-separated-values");
      return source;
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  private PersistentResultSet doReportStep(Connection conn, JobSpec currJob, String replacedReportQuery) throws SQLException {
    PersistentResultSet r = new PersistentResultSet();
    try (Statement statement = conn.createStatement();
            ResultSet rs = statement.executeQuery(replacedReportQuery)) {
      ResultSetMetaData rsmd = rs.getMetaData();
      for (int i=1;i <= rsmd.getColumnCount(); i++) {
        r.getColumnNames().add(rsmd.getColumnName(i));
        r.getColumnTypes().add(rsmd.getColumnTypeName(i));
      }
      while (rs.next()) {
        List<Object> row = new ArrayList<>();
        for (int i = 1 ; i <= rsmd.getColumnCount() ; i++) {
          row.add(rs.getObject(i));
        }
        r.getData().add(row);
      }
    }
    return r;
  }

  private void doStep(JobSpec jobSpec, String query, Statement statement) throws SQLException {
    try {
      LOG.info("doing job...:" + jobSpec.getName());
      LOG.debug("Executing query...:" + query);
      boolean isResultSet = statement.execute(query);
      if (isResultSet) {
        LOG.debug("Query returned result set.");
      } else {
        LOG.debug(String.format("Query updated %d items",
                               statement.getUpdateCount()));
      }
    } catch (SQLException ex) {
      LOG.error("Attempted query: " + query);
      throw ex;
    }
  }

  private Connection getConnectionForJobSpec(JobSpec jobSpec) {
    try {
      Class.forName(driver.getDriverName());
      return DriverManager.getConnection(driver.getConnectionUrl(), jobSpec.getUser(), jobSpec.getPassword());
    } catch (ClassNotFoundException | SQLException e) {
      throw new RuntimeException(e);
    }
  }

  public String getReplacedQuery() {
    return replacedCode;
  }

  @Override
  public String toString() {
    StringBuilder builder = new StringBuilder();
    builder.append("CallableQuery [plannedJob=");
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
    CallableQuery other = (CallableQuery) obj;
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
