package com.huffingtonpost.chronos.util;

import com.huffingtonpost.chronos.model.SupportedDriver;

import java.util.ArrayList;

import javax.sql.DataSource;

import org.h2.jdbcx.JdbcDataSource;

public class H2TestUtil {

  public static final String H2_NAME = "H2";
  public static final String H2_DRIVER = "org.h2.Driver";
  public static final String H2_URL = "jdbc:h2:mem:test;MODE=MySQL";
  public static final String H2_QUERY = "SELECT * FROM %s limit %d";

  public static ArrayList<SupportedDriver> createDriverForTesting() {
    ArrayList<SupportedDriver> drivers = new ArrayList<>();
    SupportedDriver d = new SupportedDriver(H2_NAME, H2_DRIVER, H2_QUERY,
        H2_URL);
    drivers.add(d);
    return drivers;
  }

  public static DataSource getDataSource() {
    JdbcDataSource ds = new JdbcDataSource();
    ds.setURL(H2_URL);
    return ds;
  }
}
