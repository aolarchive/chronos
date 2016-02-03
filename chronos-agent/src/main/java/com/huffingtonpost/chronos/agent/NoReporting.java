package com.huffingtonpost.chronos.agent;

public class NoReporting implements Reporting {

  @Override
  public void mark(String name) {
  }

  @Override
  public void histogram(String name, long v) {
  }

}
