package com.huffingtonpost.chronos.spring;

import org.apache.commons.dbcp2.BasicDataSource;

import javax.sql.DataSource;

public class Utils {

  public static DataSource getPooledDataSource(String connectUrl,
                                               int maxTotal,
                                               int maxWaitTimeMillis) {
    BasicDataSource bds = new BasicDataSource();
    bds.setUrl(connectUrl);
    bds.setMaxTotal(maxTotal);
    bds.setMaxWaitMillis(maxWaitTimeMillis);
    return bds;
  }

}
