package com.huffingtonpost.chronos.agent;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import com.huffingtonpost.chronos.model.JobDaoImpl;
import com.huffingtonpost.chronos.persist.BackendException;
import com.huffingtonpost.chronos.util.H2TestUtil;

public class H2TestJobDaoImpl extends JobDaoImpl {

  public static String testTableName = "testchronos";
  public static Connection conn;
  
  public void init() throws BackendException {
    this.setDataSource(H2TestUtil.getDataSource());
    try {
      conn = newConnection();
      cleanupDb();
      setUpDb();
    } catch (ClassNotFoundException | SQLException ex) {
      throw new RuntimeException(ex);
    }
    super.init();
  }
  
  public void setUpDb() throws ClassNotFoundException, SQLException {
    Connection conn = newConnection();
    Statement stat = conn.createStatement();
    stat.execute(String.format("CREATE TABLE %s (time INTEGER , url VARCHAR(255), type VARCHAR(255))", testTableName));
    String data = "(1374100685,'http://huffingtonpost.com/','vanity')," +
                  "(1374100900,'http://huffingtonpost.com/','click')," +
                  "(1374101000,'http://huffingtonpost.com/','ping')";
    stat.execute(String.format(
        "INSERT INTO %s (time, url, type) VALUES %s", testTableName, data));
    stat.close();
    conn.close();
  }
  
  private void cleanupDb() {
    try {
      Connection conn = newConnection();
      for (String sql : new String[] {
          String.format("DROP TABLE IF EXISTS %s", testTableName),
          String.format("DROP TABLE IF EXISTS %s", jobRunTableName),
          String.format("DROP TABLE IF EXISTS %s", queueTableName),
          String.format("DROP TABLE IF EXISTS %s", jobTableName) }) {
        Statement stat = conn.createStatement();
        stat.execute(sql);
        stat.close();
      }
      conn.close();
    } catch (SQLException ex) {
      ex.printStackTrace(); // this one we swallow since db might not have cleaned up last time
    }
  }
  
  public void execute(String statement) {
    try {
      Connection conn = newConnection();
      Statement stat = conn.createStatement();
      stat.execute(statement);
      stat.close();
      conn.close();
    } catch (SQLException ex) {
      ex.printStackTrace();
    }
  }
  
  public List<String> showTables() {
    List<String> tables = new ArrayList<String>();
    try {
      Connection conn = newConnection();
      Statement stat = conn.createStatement();
      ResultSet rs = stat.executeQuery("SHOW TABLES");
      while (rs.next()) {
        String table = rs.getString(1);
        tables.add(table);
      }
      rs.close();
      stat.close();
      conn.close();
    } catch (Exception ex) { ex.printStackTrace(); }
    return tables;
  }

  @Override
  public void close() {
    cleanupDb();
    super.close();
    try {
      conn.close();
    } catch (SQLException ex) {
      throw new RuntimeException(ex);
    }
  }
}
