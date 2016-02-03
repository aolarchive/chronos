// import

import {types, jobReducer} from './JobStore.js';
import {expect} from 'chai';

// fns

function getState() {
  return {
    query: null,
    jobs: {},
    deleted: [],
  };
}

// test

describe('queryJobsReducer()', () => {
  it(`should handle ${types.queryJobs} success`, () => {
    const state = jobReducer(getState(), {
      type: types.queryJobs,
      status: 'success',
      res: {
        body: [{
          id: 1,
        }],
      },
    });

    expect(state.query[0]).to.have.property('id', 1);
  });

  it(`should pass through other statuses for ${types.queryJobs}`, () => {
    const baseState = getState();

    expect(jobReducer(baseState, {
      type: types.queryJobs,
      status: 'loading',
    })).to.equal(baseState);

    expect(jobReducer(baseState, {
      type: types.queryJobs,
      status: 'failure',
    })).to.equal(baseState);
  });
});

describe('getJobReducer()', () => {
  it(`should handle ${types.getJob} success`, () => {
    const state = jobReducer(getState(), {
      type: types.getJob,
      status: 'success',
      res: {
        body: {
          id: 1,
        },
      },
    });

    expect(state.jobs[1]).to.have.property('id', 1);
  });

  it(`should pass through other statuses for ${types.getJob}`, () => {
    const baseState = getState();

    expect(jobReducer(baseState, {
      type: types.getJob,
      status: 'loading',
    })).to.equal(baseState);

    expect(jobReducer(baseState, {
      type: types.getJob,
      status: 'failure',
    })).to.equal(baseState);
  });
});

describe('createJobReducer()', () => {
  it(`should handle ${types.createJob} success`, () => {
    const baseState = getState();

    const state = jobReducer(baseState, {
      type: types.createJob,
      status: 'success',
      res: {
        body: {
          id: 1,
        },
      },
    });

    expect(state).not.to.equal(baseState);
  });

  it(`should pass through other statuses for ${types.createJob}`, () => {
    const baseState = getState();

    expect(jobReducer(baseState, {
      type: types.createJob,
      status: 'loading',
    })).to.equal(baseState);

    expect(jobReducer(baseState, {
      type: types.createJob,
      status: 'failure',
    })).to.equal(baseState);
  });
});

describe('updateJobReducer()', () => {
  it(`should handle ${types.updateJob} success`, () => {
    const baseState = getState();

    const state = jobReducer(baseState, {
      type: types.updateJob,
      status: 'success',
      res: {
        body: {
          id: 1,
        },
      },
    });

    expect(state).not.to.equal(baseState);
  });

  it(`should pass through other statuses for ${types.updateJob}`, () => {
    const baseState = getState();

    expect(jobReducer(baseState, {
      type: types.updateJob,
      status: 'loading',
    })).to.equal(baseState);

    expect(jobReducer(baseState, {
      type: types.updateJob,
      status: 'failure',
    })).to.equal(baseState);
  });
});

describe('deleteJobReducer()', () => {
  it(`should handle ${types.deleteJob} success`, () => {
    const state = jobReducer(getState(), {
      type: types.deleteJob,
      status: 'success',
      id: 1,
    });

    expect(state.deleted[0]).to.equal(1);
  });

  it(`should pass through other statuses for ${types.deleteJob}`, () => {
    const baseState = getState();

    expect(jobReducer(baseState, {
      type: types.deleteJob,
      status: 'loading',
    })).to.equal(baseState);

    expect(jobReducer(baseState, {
      type: types.deleteJob,
      status: 'failure',
    })).to.equal(baseState);
  });
});
