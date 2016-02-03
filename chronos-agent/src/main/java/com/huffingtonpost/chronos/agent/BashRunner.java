package com.huffingtonpost.chronos.agent;

import java.io.BufferedReader;
import java.io.Closeable;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;

import com.huffingtonpost.chronos.persist.BackendException;

public class BashRunner {

  public static final int SUCCESS = 0;
  
  Runtime rt;
  StreamConsumer stdout;
  StreamConsumer stderr;
  
  public void init() {
    rt = Runtime.getRuntime();
  }

  public void clean() {
    if (stdout != null) {
      try {
        stdout.close();
      } catch (IOException e) {
        throw new RuntimeException(e);
      }
      stdout = null;
    }
    if (stderr != null) {
      try {
        stderr.close();
      } catch (IOException e) {
        throw new RuntimeException(e);
      }
      stderr = null;
    }
  }

  public int exec(String command) throws BackendException {
    int exitStatus = 1;
    try {
      ProcessBuilder pb = new ProcessBuilder("bash", "-c", command);

      Process p = pb.start();
      stdout = new StreamConsumer(p.getInputStream());
      stderr = new StreamConsumer(p.getErrorStream());
      
      stdout.start();
      stderr.start();
      
      exitStatus = p.waitFor();

      stdout.join();
      stderr.join();

      stdout.close();
      stderr.close();
    } catch (IOException | InterruptedException e) {
      throw new BackendException(e);
    }
    return exitStatus;
  }
  
  public String getOutput() {
    return stdout.getStream().toString();
  }
  
  public String getError() {
    return stderr.getStream().toString();
  }
  
  private class StreamConsumer extends Thread implements Closeable {
    InputStream is;
    StringBuilder sb;
    private volatile boolean running = true;
    
    public StreamConsumer(InputStream is) {
      this.is = is;
      sb = new StringBuilder();
    }
    
    public StringBuilder getStream() {
      return sb;
    }
    
    public void run() {
      InputStreamReader isr = null;
      BufferedReader br = null;
      try {
        isr = new InputStreamReader(is);
        br = new BufferedReader(isr);
        String line = null;
        while ((line = br.readLine()) != null && running) {
          sb.append(line+"\n");
        }
      } catch (IOException ioe) {
        ioe.printStackTrace();
      } finally{
        if (isr != null) {
          try {
            isr.close();
          } catch (IOException e) {
            e.printStackTrace();
          }
        }
        if (br != null) {
          try {
            br.close();
          } catch (IOException e) {
            e.printStackTrace();
          }
        }
      }
    }

    @Override
    public void close()
      throws IOException {
      this.running = false;
    }
  }

}
