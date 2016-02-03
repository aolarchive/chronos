// import

import _ from 'lodash';
import async from 'async';
import moment from 'moment';
import {createRequestAction, createDispatcher} from '../ActionHelper/ActionHelper';
import {jobToServer} from '../JobHelper/JobHelper';
import {createMessage, createRequestMessage} from '../MessageStore/MessageStore';

// vars

const jobHistory = {
  last: null,
  next: null,
};

// fns

function getJob(state, id) {
  if (!id) {
    return state;
  }

  if (!state.jobs[id]) {
    state.jobs[id] = _.cloneDeep(jobHistory);
  }

  return state.jobs[id];
}

function createRun(job, time) {
  return {
    jobSpec: jobToServer(job),
    replaceTime: moment(time).format(),
  };
}

function collectRuns(runs, now) {
  return function collectRun(job) {
    switch (job.interval) {
    case 'Hourly':
      if (job.startMinute === now.minute()) {
        return runs.push(createRun(job, now));
      }

    case 'Daily':
      if (job.startMinute === now.minute() && job.startHour === now.hour()) {
        return runs.push(createRun(job, now));
      }

    case 'Weekly':
      if (job.startMinute === now.minute() && job.startHour === now.hour() && job.startDay % 7 === now.day()) {
        return runs.push(createRun(job, now));
      }

    case 'Monthly':
      if (job.startMinute === now.minute() && job.startHour === now.hour() && now.date() === 1) {
        return runs.push(createRun(job, now));
      }
    }

    return null;
  };
}

// types

export const types = {
  queryHistory: 'JOBS_LAST',
  queryFuture: 'JOBS_NEXT',
  rerunRun: 'JOBS_RERUN_RUN',
  rerunJob: 'JOBS_RERUN_JOB',
  rerunJobs: 'JOBS_RERUN_JOBS',
};

// actions

export const queryHistory = createRequestAction({
  type: types.queryHistory,
  endpoint: '/api/jobs/history',
  method: 'query',
  requestFn(id, query) {
    return {
      query: {id, limit: query || 100},
    };
  },
  failureFn(action) {
    createRequestMessage(action.err, action.res, {
      title: 'Last Runs',
      error: 'Unable to load the last runs list.',
    });
  },
});

export const queryFuture = createRequestAction({
  type: types.queryFuture,
  endpoint: '/api/jobs/future',
  method: 'query',
  requestFn(id, query) {
    return {
      query: {id, limit: query || 100},
    };
  },
  failureFn(action) {
    createRequestMessage(action.err, action.res, {
      title: 'Next Runs',
      error: 'Unable to load the next runs list.',
    });
  },
});

export const rerunRun = createRequestAction({
  type: types.rerunRun,
  endpoint: '/api/queue',
  method: 'query',
  requestFn(id) {
    return {
      query: {id},
    };
  },
  successFn(action) {
    createRequestMessage(action.err, action.res, {
      title: 'Re-run',
      message: 'Results will appear momentarily.',
    });
  },
  failureFn(action) {
    createRequestMessage(action.err, action.res, {
      title: 'Re-run',
    });
  },
});

export const rerunJob = createRequestAction({
  type: types.rerunJob,
  endpoint: '/api/queue',
  method: 'post',
  requestFn(id, query, send) {
    return {
      send: id || query || send,
    };
  },
});

export const rerunJobs = createDispatcher((jobs, start, end) => {
  const now = moment(new Date(start)).seconds(0).milliseconds(0);
  const then = moment(new Date(end)).seconds(0).milliseconds(1);
  const runs = [];

  const collector = collectRuns(runs, now);

  while (now.isBefore(then)) {
    jobs.forEach(collector);
    now.add(1, 'minute');
  }

  return {
    type: types.rerunJobs,
    promise: new Promise((resolve, reject) => {
      async.mapSeries(runs, (send, next) => {
        const promise = rerunJob(send).then(() => {
          next(null, promise);
        }, next);
      }, (err, res) => {
        if (!res.length) {
          createMessage({
            title: 'Re-run',
            message: 'The range you selected is too narrow to contain any jobs.',
            level: 'info',
          });

          return;
        }

        if (err) {
          createMessage({
            title: 'Re-run',
            message: 'Unable to queue new runs at this time.',
            level: 'error',
          });

          return;
        }

        createMessage({
          title: 'Re-run',
          message: 'Results will appear momentarily.',
          level: 'success',
        });

        if (err) {
          err.response = res;
          reject({err});
          return;
        }

        resolve({res});
      });
    }),
  };
});

// reducer

function queryHistoryReducer(state, action) {
  switch (action.status) {
  case 'success':
    getJob(state, action.id).last = action.res.body;
    return _.clone(state);
  }

  return state;
}

function queryFutureReducer(state, action) {
  switch (action.status) {
  case 'success':
    getJob(state, action.id).next = action.res.body;
    return _.clone(state);
  }

  return state;
}

export function runReducer(state = {last: null, next: null, jobs: {}}, action) {
  switch (action.type) {
  case types.queryHistory:
    return queryHistoryReducer(state, action);

  case types.queryFuture:
    return queryFutureReducer(state, action);
  }

  return state;
}
