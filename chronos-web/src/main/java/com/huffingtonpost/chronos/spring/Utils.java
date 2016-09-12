package com.huffingtonpost.chronos.spring;

import org.apache.commons.dbcp2.BasicDataSource;

public class Utils {

  public static BasicDataSource getPooledDataSource(String connectUrl,
                                               int maxTotal,
                                               int maxWaitTimeMillis) {
    BasicDataSource bds = new BasicDataSource();
    bds.setUrl(connectUrl);
    bds.setMaxTotal(maxTotal);
    bds.setMaxWaitMillis(maxWaitTimeMillis);
    return bds;
  }

}
