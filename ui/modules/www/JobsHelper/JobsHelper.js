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

  const {M, D, d, h, m} = schedule;

  const time = moment.utc().hour(h || 0).minute(m);

  if (D) {
    time.date(D);
  } else {
    time.day(d % 7);
  }

  if (useLocalTime) {
    time.local();
  }

  const hourStr = !h ? time.format(':mm') : time.format('h:mm a');

  if (!M && !D && !d && !h) {
    return `Hourly at ${hourStr}`;
  }

  if (!M && !D && !d) {
    return `Daily at ${hourStr}`;
  }

  if (!M && !d) {
    return `${time.format('dddd')} at ${hourStr}`;
  }

  if (!M && !D) {
    return `Monthly at ${hourStr}`;
  }

  const pretty = prettyCron.toString(cronString);

  return pretty;
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
    return getJobNiceInterval(job);
  },
};
