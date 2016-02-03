package com.huffingtonpost.chronos.agent;

import java.io.Closeable;
import java.io.IOException;

import org.apache.log4j.Logger;

public abstract class Stoppable implements Runnable, Closeable {
  private static Logger LOG = Logger.getLogger(Stoppable.class);
  
  public int SLEEP_FOR = 60 * 1000;
  
  public volatile boolean isAlive = true;
  
  public abstract void doRun();
  
  @Override
  public void close() throws IOException {
    LOG.info("Stop requested...");
    isAlive = false;
  }

}