package com.huffingtonpost.chronos.model;

import com.huffingtonpost.chronos.util.CoverageIgnore;

import java.util.List;

public class SupportedDriver {
  private String name;
  private String driverName;
  private String resultQuery;
  private String connectionUrl;

  public SupportedDriver(String name, String driverName, String resultQuery,
      String connectionUrl) {
    this.name = name;
    this.driverName = driverName;
    this.resultQuery = resultQuery;
    this.connectionUrl = connectionUrl;
  }

  public static SupportedDriver getSupportedDriverFromString(String driver,
      List<SupportedDriver> drivers) {
    SupportedDriver d = null;
    for (SupportedDriver dr : drivers) {
      if (driver.equals(dr.getName())) {
        d = dr;
      }
    }
    if (d == null) {
      throw new RuntimeException("Can't find the driver for" + driver);
    }
    return d;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getDriverName() {
    return driverName;
  }

  public void setDriverName(String driverName) {
    this.driverName = driverName;
  }

  public String getResultQuery() {
    return resultQuery;
  }

  public void setResultQuery(String resultQuery) {
    this.resultQuery = resultQuery;
  }

  public String getConnectionUrl() {
    return connectionUrl;
  }

  public void setConnectionUrl(String connectionUrl) {
    this.connectionUrl = connectionUrl;
  }

  @CoverageIgnore
  @Override
  public boolean equals(Object obj) {
    if (this == obj)
      return true;
    if (obj == null)
      return false;
    if (getClass() != obj.getClass())
      return false;
    SupportedDriver other = (SupportedDriver) obj;
    if (connectionUrl == null) {
      if (other.connectionUrl != null)
        return false;
    } else if (!connectionUrl.equals(other.connectionUrl))
      return false;
    if (driverName == null) {
      if (other.driverName != null)
        return false;
    } else if (!driverName.equals(other.driverName))
      return false;
    if (name == null) {
      if (other.name != null)
        return false;
    } else if (!name.equals(other.name))
      return false;
    if (resultQuery == null) {
      if (other.resultQuery != null)
        return false;
    } else if (!resultQuery.equals(other.resultQuery))
      return false;
    return true;
  }

  @CoverageIgnore
  @Override
  public int hashCode() {
    final int prime = 31;
    int result = 1;
    result = prime * result
      + ((connectionUrl == null) ? 0 : connectionUrl.hashCode());
    result = prime * result
      + ((driverName == null) ? 0 : driverName.hashCode());
    result = prime * result + ((name == null) ? 0 : name.hashCode());
    result = prime * result
      + ((resultQuery == null) ? 0 : resultQuery.hashCode());
    return result;
  }
}
