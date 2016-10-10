package com.huffingtonpost.chronos.model;

import java.util.ArrayList;
import java.util.List;

public class JobNode {
  private String parent;
  private String name;
  private List<JobNode> children = new ArrayList<>();

  public JobNode(String parent, String name) {
    this.parent = parent;
    this.name = name;
  }

  public String getParent() {
    return parent;
  }

  public void setParent(String parent) {
    this.parent = parent;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public List<JobNode> getChildren() {
    return children;
  }

  public void setChildren(List<JobNode> children) {
    this.children = children;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (o == null || getClass() != o.getClass()) return false;

    JobNode jobNode = (JobNode) o;

    if (parent != null ? !parent.equals(jobNode.parent) : jobNode.parent != null)
      return false;
    if (name != null ? !name.equals(jobNode.name) : jobNode.name != null)
      return false;
    return children != null ? children.equals(jobNode.children) : jobNode.children == null;
  }

  @Override
  public int hashCode() {
    int result = parent != null ? parent.hashCode() : 0;
    result = 31 * result + (name != null ? name.hashCode() : 0);
    result = 31 * result + (children != null ? children.hashCode() : 0);
    return result;
  }

  @Override
  public String toString() {
    return "JobNode{" +
      "parent='" + parent + '\'' +
      ", name='" + name + '\'' +
      ", children=" + children +
      '}';
  }
}
