package com.huffingtonpost.chronos.model;

import java.util.ArrayList;
import java.util.List;

public class PersistentResultSet {
  private List<String> columnNames;
  private List<String> columnTypes;
  private List<List<Object>> data;
  
  public PersistentResultSet() {
    columnNames = new ArrayList<>();
    columnTypes = new ArrayList<>();
    data = new ArrayList<>();
  }

  public List<String> getColumnNames() {
    return columnNames;
  }

  public void setColumnNames(List<String> columnNames) {
    this.columnNames = columnNames;
  }

  public List<String> getColumnTypes() {
    return columnTypes;
  }

  public void setColumnTypes(List<String> columnTypes) {
    this.columnTypes = columnTypes;
  }

  public List<List<Object>> getData() {
    return data;
  }

  public void setData(List<List<Object>> data) {
    this.data = data;
  }
    
}
