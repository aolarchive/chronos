package com.huffingtonpost.chronos.agent;

import com.codahale.metrics.MetricRegistry;
import com.huffingtonpost.chronos.util.CoverageIgnore;

public class GraphiteReporting implements Reporting {
  public MetricRegistry metricRegistry;

  public GraphiteReporting(MetricRegistry metricRegistry) {
    this.metricRegistry = metricRegistry;
  }

  @CoverageIgnore
  public void mark(String name) {
    metricRegistry.meter(name).mark();
  }

  @CoverageIgnore
  public void histogram(String name, long v) {
    metricRegistry.histogram(name).update(v);
  }
}