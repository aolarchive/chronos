// import

import _ from 'lodash';
import moment from 'moment';

// vars

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

export function getJobNiceInterval(job, useLocalTime) {
  const time = moment.utc()
  .hour(job.startHour)
  .minute(job.startMinute)
  .day(job.startDay % 7);

  if (useLocalTime) {
    time.local();
  }

  const diffDate = useLocalTime && time.clone().utc().date() !== time.date();

  switch (job.interval) {
  case 'Hourly':
    return `Hourly at ${time.format(':mm')}`;
  case 'Daily':
    return `Daily at ${time.format('h:mm a')}`;
  case 'Weekly':
    return `${time.format('dddd')} at ${time.format('h:mm a')}`;
  case 'Monthly':
    return `${diffDate ? 'Last' : 'First'} of Month at ${time.format('h:mm a')}`;
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
