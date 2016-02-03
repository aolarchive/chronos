package com.huffingtonpost.chronos.agent;

import com.codahale.metrics.MetricRegistry;

public class GraphiteReporting implements Reporting {
  public MetricRegistry metricRegistry;

  public GraphiteReporting(MetricRegistry metricRegistry) {
    this.metricRegistry = metricRegistry;
  }

  public void mark(String name) {
    metricRegistry.meter(name).mark();
  }

  public void histogram(String name, long v) {
    metricRegistry.histogram(name).update(v);
  }
}