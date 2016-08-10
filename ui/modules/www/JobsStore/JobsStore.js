// import

import _ from 'lodash';
import {createRequestAction} from '../ActionHelper/ActionHelper';
import {jobToClient, jobToServer} from '../JobsHelper/JobsHelper';
import {createRequestMessage} from '../MessageStore/MessageStore';

// vars

const initialState = {
  query: [],
  byID: {},
  byParent: [],
  jobs: {},
  versions: {},
  deleted: [],
};

let cache = {};

// types

export const types = {
  queryJobs: 'JOBS_QUERY',
  getJob: 'JOBS_GET',
  getJobVersions: 'JOBS_GET_VERSIONS',
  createJob: 'JOBS_CREATE',
  updateJob: 'JOBS_UPDATE',
  deleteJob: 'JOBS_DELETE',
};

// actions

export const queryJobs = createRequestAction({
  type: types.queryJobs,
  endpoint: '/api/jobs',
  method: 'query',
  failureFn(action) {
    createRequestMessage(action.err, action.res, {
      title: 'Jobs List',
      error: 'Could not load the jobs list.',
    });
  },
});

export const getJob = createRequestAction({
  type: types.getJob,
  endpoint: '/api/job/:id',
  method: 'get',
  failureFn(action) {
    createRequestMessage(action.err, action.res, {
      title: 'Job View',
      error: 'Could not load the requested job.',
    });
  },
});

export const getJobVersions = createRequestAction({
  type: types.getJobVersions,
  endpoint: '/api/job/version/:id',
  method: 'get',
  failureFn(action) {
    createRequestMessage(action.err, action.res, {
      title: 'Job View',
      error: 'Could not load version history for the requested job.',
    });
  },
});

function updateParent(action, after) {
  const {_dependsOn} = action.send;

  if (_dependsOn) {
    const parent = _.cloneDeep(cache.byID[_dependsOn]);

    parent.children = parent.children ? _.uniq(parent.children.concat(_dependsOn)) : [_dependsOn];
    parent._silent = true;

    updateJob(action.send._dependsOn, null, parent).then(after);
  } else {
    after();
  }
}

export const createJob = createRequestAction({
  type: types.createJob,
  endpoint: '/api/job',
  method: 'post',
  requestFn(id, query, send) {
    return {send: jobToServer(send)};
  },
  successFn(action) {
    updateParent(action, () => {
      getJob(action.res.body.id);
      createRequestMessage(action.err, action.res, {
        title: 'Create Job',
        message: 'Job created successfully.',
      });
    });
  },
  failureFn(action) {
    createRequestMessage(action.err, action.res, {
      title: 'Create Job',
      error: action.res.body && _.capitalize(action.res.body.response) || 'Could not create the job.',
    });
  },
});

export const updateJob = createRequestAction({
  type: types.updateJob,
  endpoint: '/api/job/:id',
  method: 'put',
  requestFn(id, query, send) {
    return {send: jobToServer(send)};
  },
  successFn(action) {
    updateParent(action, () => {
      getJob(action.id);

      if (!action.send._silent) {
        createRequestMessage(action.err, action.res, {
          title: 'Update Job',
          message: 'Job updated successfully.',
        });
      }
    });
  },
  failureFn(action) {
    createRequestMessage(action.err, action.res, {
      title: 'Update Job',
      error: action.res.body && _.capitalize(action.res.body.response) || 'Could not update the job.',
    });
  },
});

export const deleteJob = createRequestAction({
  type: types.deleteJob,
  endpoint: '/api/job/:id',
  method: 'delete',
  successFn(action) {
    createRequestMessage(action.err, action.res, {
      title: 'Delete Job',
      message: 'Job deleted successfully.',
    });
  },
  failureFn(action) {
    createRequestMessage(action.err, action.res, {
      title: 'Delete Job',
      error: 'Could not delete the job.',
    });
  },
});

// export

function queryJobsReducer(state, action) {
  switch (action.status) {
  case 'success':
    state.query = action.res.body.map(jobToClient);
    state.byID = _.keyBy(state.query, 'id');

    const clones = _.cloneDeep(state.query);

    const children = _.chain(clones).reduce((arr, job) => {
      return job.children ? arr.concat(job.children) : arr;
    }, []).uniq().value();

    state.byParent = clones.reduce((arr, job, id) => {
      if (children.indexOf(id) === -1) {
        arr.push(job);
      }

      if (job.children) {
        job.children = job.children.map((child) => {
          return clones[child];
        });
      }

      return arr;
    }, []);

    cache = _.clone(state);
    return _.clone(state);
  }

  return state;
}

function getJobReducer(state, action) {
  switch (action.status) {
  case 'success':
    state.jobs[action.res.body.id] = jobToClient(action.res.body);
    cache = _.clone(state);
    return _.clone(state);
  }

  return state;
}

function getJobVersionsReducer(state, action) {
  switch (action.status) {
  case 'success':
    state.versions[action.id] = action.res.body.map(jobToClient);
    cache = _.clone(state);
    return _.clone(state);
  }

  return state;
}

function createJobReducer(state, action) {
  switch (action.status) {
  case 'success':
    cache = _.clone(state);
    return _.clone(state);
  }

  return state;
}

function updateJobReducer(state, action) {
  switch (action.status) {
  case 'success':
    cache = _.clone(state);
    return _.clone(state);
  }

  return state;
}

function deleteJobReducer(state, action) {
  switch (action.status) {
  case 'success':
    state = _.assign({}, state, {deleted: state.deleted.concat(action.id)});
    cache = _.clone(state);
    return state;
  }

  return state;
}

export function jobsReducer(state = initialState, action) {
  switch (action.type) {
  case types.queryJobs:
    return queryJobsReducer(state, action);

  case types.getJob:
    return getJobReducer(state, action);

  case types.getJobVersions:
    return getJobVersionsReducer(state, action);

  case types.createJob:
    return createJobReducer(state, action);

  case types.updateJob:
    return updateJobReducer(state, action);

  case types.deleteJob:
    return deleteJobReducer(state, action);
  }

  return state;
}
