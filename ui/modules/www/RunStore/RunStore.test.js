// import

import {types, runReducer} from './RunStore.js';
import {expect} from 'chai';

// fns

function getState() {
  return {
    query: null,
    jobs: {
      2: {
        last: null,
        next: null,
      },
    },
    deleted: [],
  };
}

// test

describe('runReducer', () => {
  it(`should handle ${types.queryHistory} with job id`, () => {
    const last = [];
    const state = runReducer(getState(), {
      type: `${types.queryHistory}`,
      status: 'success',
      id: 1,
      res: {
        body: last,
      },
    });

    expect(state.jobs[1]).to.have.property('last', last);
  });

  it(`should handle ${types.queryHistory} without job id`, () => {
    const last = [];
    const state = runReducer(getState(), {
      type: `${types.queryHistory}`,
      status: 'success',
      res: {
        body: last,
      },
    });

    expect(state.last).to.equal(last);
  });

  it(`should handle ${types.queryFuture} with job id`, () => {
    const next = [];
    const state = runReducer(getState(), {
      type: `${types.queryFuture}`,
      status: 'success',
      id: 2,
      res: {
        body: next,
      },
    });

    expect(state.jobs[2]).to.have.property('next', next);
  });

  it(`should handle ${types.queryFuture} without job id`, () => {
    const next = [];
    const state = runReducer(getState(), {
      type: `${types.queryFuture}`,
      status: 'success',
      res: {
        body: next,
      },
    });

    expect(state.next).to.equal(next);
  });
});
