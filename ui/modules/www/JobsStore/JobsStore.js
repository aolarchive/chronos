// import

import _ from 'lodash';
import {createRequestAction} from '../ActionHelper/ActionHelper';
import {jobToClient, jobToServer} from '../JobsHelper/JobsHelper';
import {createRequestMessage} from '../MessageStore/MessageStore';

// vars

const initialState = {
  query: null,
  jobs: {},
  deleted: [],
};

// types

export const types = {
  queryJobs: 'JOBS_QUERY',
  getJob: 'JOBS_GET',
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

export const createJob = createRequestAction({
  type: types.createJob,
  endpoint: '/api/job',
  method: 'post',
  requestFn(id, query, send) {
    return {send: jobToServer(send)};
  },
  successFn(action) {
    createRequestMessage(action.err, action.res, {
      title: 'Create Job',
      message: 'Job created successfully.',
    });

    getJob(action.res.body.id);
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
    createRequestMessage(action.err, action.res, {
      title: 'Update Job',
      message: 'Job updated successfully.',
    });

    getJob(action.id);
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
    return _.clone(state);
  }

  return state;
}

function getJobReducer(state, action) {
  switch (action.status) {
  case 'success':
    state.jobs[action.res.body.id] = jobToClient(action.res.body);
    return _.clone(state);
  }

  return state;
}

function createJobReducer(state, action) {
  switch (action.status) {
  case 'success':
    return _.clone(state);
  }

  return state;
}

function updateJobReducer(state, action) {
  switch (action.status) {
  case 'success':
    return _.clone(state);
  }

  return state;
}

function deleteJobReducer(state, action) {
  switch (action.status) {
  case 'success':
    return _.assign({}, state, {deleted: state.deleted.concat(action.id)});
  }

  return state;
}

export function jobsReducer(state = initialState, action) {
  switch (action.type) {
  case types.queryJobs:
    return queryJobsReducer(state, action);

  case types.getJob:
    return getJobReducer(state, action);

  case types.createJob:
    return createJobReducer(state, action);

  case types.updateJob:
    return updateJobReducer(state, action);

  case types.deleteJob:
    return deleteJobReducer(state, action);
  }

  return state;
}
