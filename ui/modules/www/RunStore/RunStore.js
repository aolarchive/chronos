// import

import _ from 'lodash';
import async from 'async';
import moment from 'moment';
import {createRequestAction, createDispatcher, createAction} from '../ActionHelper/ActionHelper';
import {jobToServer} from '../JobsHelper/JobsHelper';
import {createMessage, createRequestMessage} from '../MessageStore/MessageStore';
import later from 'later';

// vars

const jobHistory = {
  last: null,
  next: null,
  queue: null,
};

const tabs = [
  'last',
  'queue',
  'next',
];

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
  now.utc();

  return function collectRun(job) {
    if (later.schedule(later.parse.cron(job.cronString)).isValid(now.toDate())) {
      runs.push(createRun(job, now));
    }
  };
}

// types

export const types = {
  queryHistory: 'RUNS_GET_LAST',
  queryQueue: 'RUNS_GET_QUEUE',
  queryFuture: 'RUNS_GET_NEXT',
  rerunRun: 'RUNS_RERUN_RUN',
  cancelRun: 'RUNS_CANCEL_RUN',
  rerunJob: 'RUNS_RERUN_JOB',
  rerunJobs: 'RUNS_RERUN_JOBS',
  changeTab: 'RUNS_CHANGE_TAB',
};

// actions

export const changeTab = createAction(types.changeTab, ['tab']);

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

export const queryQueue = createRequestAction({
  type: types.queryQueue,
  endpoint: '/api/queue',
  method: 'query',
  requestFn(id, query) {
    return {
      query: {id, limit: query || 100},
    };
  },
  failureFn(action) {
    createRequestMessage(action.err, action.res, {
      title: 'Queued Runs',
      error: 'Unable to load the queued runs list.',
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

export const cancelRun = createRequestAction({
  type: types.cancelRun,
  endpoint: '/api/queue',
  method: 'delete',
  staticUrl: true,
  requestFn(job) {
    return {
      id: null,
      send: job.plannedJob || job,
    };
  },
  successFn(action) {
    createRequestMessage(action.err, action.res, {
      title: 'Cancel Run',
      message: 'Job will be canceled.',
    });
  },
  failureFn(action) {
    createRequestMessage(action.err, action.res, {
      title: 'Cancel Run',
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

export const rerunJobs = createDispatcher((jobs, start, end, intervals) => {
  const now = moment(new Date(start)).seconds(0).milliseconds(0);
  const then = moment(new Date(end)).seconds(0).milliseconds(1);
  const runs = [];

  const collector = collectRuns(runs, now);
  jobs = jobs.filter((job) => {
    return job.enabled && (!intervals || intervals.indexOf(job.interval) > -1);
  });

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
        if (!jobs.length) {
          createMessage({
            title: 'Re-run',
            message: 'That time range contains no enabled jobs.',
            level: 'info',
          });

          return;
        }

        if (!res.length) {
          createMessage({
            title: 'Re-run',
            message: 'That time range is too narrow for the jobs selected.',
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

        queryHistory();
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

function queryQueueReducer(state, action) {
  switch (action.status) {
  case 'success':
    getJob(state, action.id).queue = action.res.body;
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

function changeTabReducer(state, action) {
  if (tabs.indexOf(action.tab) > -1) {
    return _.assign({}, state, {tab: action.tab});
  }

  return state;
}

export function runReducer(state = {
  last: null,
  next: null,
  queue: null,
  tab: 'last',
  jobs: {},
}, action) {
  switch (action.type) {
  case types.queryHistory:
    return queryHistoryReducer(state, action);

  case types.queryQueue:
    return queryQueueReducer(state, action);

  case types.queryFuture:
    return queryFutureReducer(state, action);

  case types.changeTab:
    return changeTabReducer(state, action);
  }

  return state;
}
