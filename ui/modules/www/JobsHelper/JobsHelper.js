// rules

/* eslint-disable import/no-commonjs */

// import

import _ from 'lodash';
import React from 'react';
import cn from 'classnames';
import later from 'later';
import moment from 'moment';
import prettyCron from 'prettycron';
import styles from './JobsHelper.css';
const JsDiff = require('diff');

// vars

const types = [
  'script',
  'query',
  'report',
];

const days = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const statuses = [
  'unknown',
  'error',
  'running',
  'success',
];

// fns

function getSchedule(job) {
  if (!job) {
    return null;
  }

  const s = later.parse.cron(job.cronString || job).schedules[0];

  const mapped = _.mapValues(s, (val) => {
    return val[0];
  });
  delete mapped.s;

  return _.isEmpty(mapped) ? null : mapped;
}

// export

export function jobToClient(job) {
  return _.assign(job, {
    resultEmail: _.isArray(job.resultEmail) ? job.resultEmail.map((line) => {
      return line.trim();
    }).join('\n') : '',
    statusEmail: _.isArray(job.statusEmail) ? job.statusEmail.map((line) => {
      return line.trim();
    }).join('\n') : '',
  });
}

export function jobToServer(job) {
  job = _.cloneDeep(job);
  job.parent = parseInt(job.parent);

  if (_.isNaN(job.parent)) {
    job.parent = null;
  } else if (_.isNumber(job.parent)) {
    job.cronString = null;
  }

  delete job.depth;
  delete job.shouldKeep;
  delete job.children;
  delete job.statusTags;

  return _.assign(job, {
    resultEmail: _.isArray(job.resultEmail) ? job.resultEmail : job.resultEmail.split('\n').map((line) => {
      return line.trim();
    }),
    statusEmail: _.isArray(job.statusEmail) ? job.statusEmail : job.statusEmail.split('\n').map((line) => {
      return line.trim();
    }),
  });
}

export function getJobType(job) {
  return job.resultQuery && job.resultQuery.trim() ? 'report' : job.type === 'Script' ? 'script' : 'query';
}

export function getJobNiceInterval(cronString, useLocalTime) {
  const schedule = getSchedule(cronString);

  if (!schedule) {
    return null;
  }

  const {D, d, h, m} = schedule;

  const time = moment.utc();
  time.hour(h || 0);
  time.minute(m);

  if (D) {
    time.date(D);
  } else {
    time.day(d % 7);
  }

  if (useLocalTime) {
    time.local();
  }

  return prettyCron.toString(cronString)
  .replace(/every hour, on the hour/i, () => {
    return `Hourly at ${time.format(':mm')}`;
  })
  .replace(/every (\d+)(th|rd|st|nd) minute past every hour/i, () => {
    return `Hourly at ${time.format(':mm')}`;
  })
  .replace(/(\d{1,2}:\d{1,2}) every day/i, () => {
    return `Daily at ${time.format('h:mma')}`;
  })
  .replace(/(\d{1,2}:\d{1,2}) on the 1st of every month/i, () => {
    return `Monthly at ${time.format('h:mma')}`;
  })
  .replace(/(\d{1,2}:\d{1,2}) on (sun|mon|tue|wed|thu|fri|sat)/i, (match, p1, p2) => {
    return `${days[p2.toLowerCase()]} at ${time.format('h:mma')}`;
  });
}

// sort

function statusSort(job) {
  return [
    (job.enabled ? 0 : 1),
    statuses.indexOf(job.statusTags[0].key),
    job.statusTags[1] ? 0 : 1,
    job.name.toLowerCase().trim(),
  ].join(' ');
}

export const orderJobsBy = {
  name(job) {
    return job.name.toLowerCase().trim();
  },

  type(job) {
    return [
      types.indexOf(getJobType(job)),
      job.name.toLowerCase().trim(),
    ].join(' ');
  },

  enabled: statusSort,

  status: statusSort,

  interval(job) {
    const val = getJobNiceInterval(job.cronString);

    return _.padStart([
      'Hourly',
      'Daily',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
      'Weekly',
      'Monthly',
    ].indexOf((/^(\w+) /i).exec(val)[1]), 2, 0) + ' ' + val;
  },
};

// parents

export function collectChildren(job, jobs, deep = false) {
  const children = [];

  if (!job) {
    return children;
  }

  jobs.forEach((thisJob) => {
    if (thisJob.parent === job.id) {
      children.push(thisJob);

      if (deep) {
        const deepChildren = collectChildren(thisJob, jobs, deep);
        children.push.apply(children, deepChildren);
      }
    }
  });

  return children;
}

export function getRoot(job, jobsByID) {
  let found = false;
  let current = job;

  while (!found) {
    if (_.isNumber(current.parent) && jobsByID[current.parent]) {
      current = jobsByID[current.parent];
    } else {
      found = true;
    }
  }

  return current;
}

/* runs */

// fns

export function formatRun(run) {
  return _.assign(run, {
    niceName: run.name ? run.name.replace(/_/g, '_<wbr>') : null,
  });
}

export function formatLast(run) {
  return formatRun({
    id: run.jobId,
    jobId: run.plannedJob.jobSpec.id,
    enabled: run.plannedJob.jobSpec.enabled,
    name: run.plannedJob.jobSpec.name,
    time: run.start ? moment(run.start) : null,
    err: run.exceptionMessage,
    error: run.finish !== 0 && run.status !== 0,
    pending: run.finish === 0,
    attemptNumber: run.attemptNumber,
    shouldRerun: run.plannedJob.jobSpec.shouldRerun,
    replaceTime: run.plannedJob.replaceTime,
  });
}

export function formatQueue(run) {
  return formatRun({
    id: null,
    jobId: run.jobSpec.id,
    name: run.jobSpec.name,
    time: run.start ? moment(run.start) : null,
    err: null,
    error: false,
    pending: false,
    attemptNumber: run.attemptNumber,
  });
}

export function formatNext(run) {
  return formatRun({
    name: run.name,
    time: run.time ? moment(run.time) : null,
    attemptNumber: run.attemptNumber,
  });
}

function getCardinal(num) {
  switch (num) {
  case 1:
    return '1st';
  case 2:
    return '2nd';
  case 3:
    return '3rd';
  case 4:
    return '4th';
  case 5:
    return '5th';
  }

  return null;
}

export function getUnknownTag(text = 'unknown') {
  return (<div key="unknown" className={cn(styles.tag, styles.gray)}>{text}</div>);
}

export function getRunTags(run, extraTags = false) {
  const tags = [];

  if (run.pending) {
    tags.push(<div key="running" className={cn(styles.tag, styles.blue)}>running</div>);
  }

  if (run.error) {
    tags.push(<div key="error" className={cn(styles.tag, styles.red)}>error</div>);

    if (run.shouldRerun) {
      if (run.attemptNumber < 5) {
        tags.push(<div key="attempt" className={cn(styles.tag, styles.yellow)}>{getCardinal(run.attemptNumber + 1)} attempt scheduled</div>);
      } else {
        tags.push(<div key="attempt" className={cn(styles.tag, styles.yellow)}>final attempt</div>);
      }
    } else {
      tags.push(<div key="attempt" className={cn(styles.tag, styles.yellow)}>rerun disabled</div>);
    }
  }

  if (extraTags && run.pending === false && run.error === false) {
    tags.push(<div key="success" className={cn(styles.tag, styles.green)}>success</div>);
  }

  if (run.attemptNumber > 1 && !run.error) {
    tags.push(<div key="attempt" className={cn(styles.tag, styles.yellow)}>{getCardinal(run.attemptNumber)} attempt</div>);
  }

  return !tags.length && extraTags ? getUnknownTag() : tags;
}

export function orderJobs(jobs = [], orderBy, orderDir) {
  return _.orderBy(jobs, orderJobsBy[orderBy], orderDir)
  .map((job) => {
    if (job.children && job.children.length) {
      job.children = orderJobs(job.children, orderBy, orderDir);
    }

    return job;
  });
}

export function flattenJobs(depth, flat, job) {
  job.depth = depth;
  flat.push(job);

  if (job.children.length) {
    flat = flat.concat(job.children.reduce(flattenJobs.bind(flattenJobs, depth + 1), []));
  }

  return flat;
}

export function getJobDiff(prev, next, field) {
  prev = prev || {};
  next = next || {};

  return JsDiff.diffLines(prev[field] || '', next[field] || '')
  .map((seg) => {
    return seg.value
    .split('\n')
    .slice(0, -1)
    .map((line) => {
      if (seg.added) {
        return '+ ' + line;
      }

      if (seg.removed) {
        return '- ' + line;
      }

      return '  ' + line;
    })
    .join('\n');
  })
  .join('\n');
}
