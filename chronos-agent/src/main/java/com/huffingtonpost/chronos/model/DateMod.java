package com.huffingtonpost.chronos.model;

public enum DateMod {
  D("Days"),
  H("Hours"),
  M("Months");
  public final String name;
  DateMod(String name) {
    this.name = name;
  }
}