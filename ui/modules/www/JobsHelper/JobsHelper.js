// import

import _ from 'lodash';

// vars

const daysOfWeek = [
  'Sundays',
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
];

const intervals = [
  'Hourly',
  'Daily',
  'Weekly',
  'Monthly',
];

const types = [
  'script',
  'query',
  'report',
];

// fns

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

export function getJobNiceInterval(job) {
  switch (job.interval) {
  case 'Hourly':
    return `Hourly at :${_.padStart(job.startMinute, 2, '0')}`;
  case 'Daily':
    return `Daily at ${job.startHour}:${_.padStart(job.startMinute, 2, '0')}`;
  case 'Weekly':
    return `${daysOfWeek[job.startDay % 7]} at ${job.startHour}:${_.padStart(job.startMinute, 2, '0')}`;
  case 'Monthly':
    return `Monthly at ${job.startHour}:${_.padStart(job.startMinute, 2, '0')}`;
  }

  return 'N/A';
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
    return [
      intervals.indexOf(job.interval),
      job.interval === 'Weekly' ? _.padStart(job.startDay, 2, '0') : '00',
      job.interval !== 'Hourly' ? _.padStart(job.startHour, 2, '0') : '00',
      _.padStart(job.startMinute, 2, '0'),
      (job.enabled ? 0 : 1),
      job.name.toLowerCase().trim(),
    ].join(' ');
  },
};
