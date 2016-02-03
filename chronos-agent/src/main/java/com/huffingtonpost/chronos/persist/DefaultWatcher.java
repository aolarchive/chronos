package com.huffingtonpost.chronos.persist;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.apache.log4j.Logger;
import org.apache.zookeeper.WatchedEvent;
import org.apache.zookeeper.Watcher;
import org.apache.zookeeper.Watcher.Event.KeeperState;

public class DefaultWatcher implements Watcher {

  private static Logger LOG = Logger.getLogger(DefaultWatcher.class);
  private final CountDownLatch connectedLatch = new CountDownLatch(1);
  private boolean isDisconnected = false;
  
  @Override
  public void process(WatchedEvent event) {
    KeeperState state = event.getState();
    if (state.equals(KeeperState.SyncConnected)) {
      connectedLatch.countDown();
    } else {
      LOG.info("ZK disconnected, state was: " + state);
      isDisconnected = true;
    }
  }
  
  public void waitTilConnected(int sec) throws InterruptedException {
    connectedLatch.await(sec, TimeUnit.SECONDS);
  }

  public boolean isDisconnected() {
    return isDisconnected;
  }

}
