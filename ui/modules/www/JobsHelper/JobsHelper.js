// import

import _ from 'lodash';
import React from 'react';
import cn from 'classnames';
import later from 'later';
import moment from 'moment';
import prettyCron from 'prettycron';
import styles from './JobsHelper.css';

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
  delete job.parentID;

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

export function collectChildren(children, jobsByID) {
  const newChildren = [];

  children.forEach((child) => {
    if (jobsByID[child].children && jobsByID[child].children.length) {
      newChildren.push.apply(newChildren, collectChildren(jobsByID[child].children, jobsByID));
    }
  });

  return children.concat(newChildren);
}

export function findParent(id, jobsByID) {
  id = parseInt(id);

  const key = _.findKey(jobsByID, (job) => {
    return job.children && job.children.indexOf(id) > -1;
  });

  return key ? parseInt(key) : null;
}

export function getParent(id, jobsByID) {
  if (!id || !jobsByID) {
    return null;
  }

  return jobsByID[findParent(id, jobsByID)];
}

export function findRoot(id, jobsByID) {
  let searchID = id;
  let foundID = null;

  while (searchID) {
    searchID = findParent(searchID, jobsByID);
    foundID = searchID || foundID;
  }

  return foundID;
}

export function getRoot(id, jobsByID) {
  if (!id || !jobsByID) {
    return null;
  }

  return jobsByID[findRoot(id, jobsByID)];
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
