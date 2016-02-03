package com.huffingtonpost.chronos.agent;

public interface Reporting {

  public void mark(String name);

  public void histogram(String name, long v);
}
