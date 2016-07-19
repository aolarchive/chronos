# chronos

> cron-like jobs for back-end systems

![UI](/../screenshots/ui.png?raw=true "UI")

## Features of _chronos_

* job history tracking
* job versions
* automatic rerun with configurable max attempts
* email notifications (reports, failures, etc)
* REST [api][api]
* multiple datasource support
* BSD [license][license]

[api]: chronos-web/src/main/java/com/huffingtonpost/chronos/servlet/ChronosController.java
[license]: LICENSE


## What is _chronos_?

_chronos_ is for running jobs that would normally be put into a crontab but
would be easier to manage and track through a simple ui and some retry and
emailing mechanisms.


### Example use-cases

A _chronos_ job could be a Hive Query that needs to run every hour to
populate a table that your api queries for an internal app, or just a periodic
query that transforms some data for another back-end process. Another example
might be a recurring report that needs to be sent to business leads every week,
that queries a MySql database and sends the top 100 results. _chronos_ makes
these tasks simple to create, update, track, and rerun.


## Why _chronos_?

You're probably tired of ssh-ing to machines and rerunning jobs manually after
hearing that they failed from someone that's not even on your tech team. So
we've built a system that takes care of that and let's you rest easy on the
weekend and hopefully spend more time coding during work hours.

_chronos_ has been implemented in a way that lets you add a new back-end
for storing jobs and history if needed. Currently we have a MySql
implementation of the [WithBackend interface][backend]. It would be trivial to
add more to suit your needs. JDBC connections are currently used for
jobs.

[backend]: chronos-agent/src/main/java/com/huffingtonpost/chronos/persist/WithBackend.java

## Configuration and Prerequisites

_chronos_ uses a Java-based [spring config][sc].

* java 7 for backend
* node >= 4 and npm >= 3 for ui

[sc]: chronos-web/src/main/java/com/huffingtonpost/chronos/servlet/TestConfig.java

## Test
[![Build Status](https://travis-ci.org/aol/chronos.svg?branch=master)](https://travis-ci.org/aol/chronos)
[![Coverage Status](https://coveralls.io/repos/github/aol/chronos/badge.svg?branch=master)](https://coveralls.io/github/aol/chronos?branch=master)

    mvn clean test


### Run locally

    ./build_site.sh
    mvn clean package install
    cd chronos-web/
    mvn tomcat7:run

Note: This creates a small test table in H2 for running jobs against.
Details of the table can be found [here][table].

[table]: chronos-agent/src/test/java/com/huffingtonpost/chronos/agent/H2TestJobDaoImpl.java


#### Run a job with the ui

1. Navigate to http://localhost:8080
2. Click New Job
3. Fill out the form. A query similar to `CREATE TABLE my_table_name AS SELECT * FROM testchronos;`
   will work.
4. View log output of `mvn tomcat7:run` to see that job has completed.


## Future development

[Pull-requests][pr] are welcome! Feel free to contact us with Github Issues.

[pr]: https://help.github.com/articles/using-pull-requests/


## Further Reading

[Reliable Cron Across the Planet](https://queue.acm.org/detail.cfm?id=2745840)

[Chronos: A Replacement for Cron](http://nerds.airbnb.com/introducing-chronos/)

[Quora's Distributed Cron Architecture](https://engineering.quora.com/Quoras-Distributed-Cron-Architecture)

[Distributed Job Scheduling for AWS](https://medium.com/aws-activate-startup-blog/distributed-job-scheduling-for-aws-1c9f984b336d#.ymfpq4jt9)

[Luigi](https://github.com/spotify/luigi)


## Authors

_chronos_ was built at [The Huffington Post](http://www.huffingtonpost.com/),
mainly by [@sinemetu1][sm1], [@mikestopcontinues][msc], [@edwardcapriolo][ec],
[@ellnuh][se], and [@dmitry-s][ds].

[sm1]: https://github.com/sinemetu1
[msc]: https://github.com/mikestopcontinues
[ec]: https://github.com/edwardcapriolo
[se]: https://www.instagram.com/ellnuh/
[ds]: https://github.com/dmitry-s
