// import

import _ from 'lodash';
import later from 'later';
import moment from 'moment';
import prettyCron from 'prettycron';

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

// fns

function getSchedule(job = '') {
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
    return 'N/A';
  }

  const {D, d, h, m} = schedule;

  const time = moment.utc().hour(h || 0).minute(m);

  if (D) {
    time.date(D);
  } else {
    time.day(d % 7);
  }

  if (useLocalTime) {
    time.local();
  }

  return prettyCron.toString(cronString)

  .replace(/every hour, on the hour/i, `Hourly at ${time.format(':mm')}`)

  .replace(/every (\d+)(th|rd|st|nd) minute past every hour/i, () => {
    return `Hourly at ${time.format(':mm')}`;
  })

  .replace(/(\d{1,2}:\d{1,2}) every day/i, () => {
    return `Daily at ${time.format('h:mma')}`;
  })

  .replace(/(\d{1,2}:\d{1,2}) on (sun|mon|tue|wed|thu|fri|sat)/i, (match, p1, p2) => {
    return `${days[p2.toLowerCase()]} at ${time.format('h:mma')}`;
  })

  .replace(/(\d{1,2}:\d{1,2}) on the 1st of every month/i, () => {
    return `Monthly at ${time.format('h:mma')}`;
  });
}

// sort

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

  enabled(job) {
    return [
      (job.enabled ? 0 : 1),
      job.name.toLowerCase().trim(),
    ].join(' ');
  },

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
  return _.findKey(jobsByID, (job) => {
    return job.children && job.children.indexOf(id) > -1;
  });
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
