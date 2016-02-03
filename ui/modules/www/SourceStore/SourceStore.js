// import

import _ from 'lodash';
import {createRequestAction} from '../ActionHelper/ActionHelper';
import {createRequestMessage} from '../MessageStore/MessageStore.js';

// types

const types = {
  querySources: 'SOURCES_QUERY',
};

// actions

export const querySources = createRequestAction({
  type: types.querySources,
  endpoint: '/api/sources',
  method: 'query',
  failureFn(action) {
    createRequestMessage(action.err, action.res, {
      title: 'Database Sources',
      error: 'Could not populate the database dropdown.',
    });
  },
});

// reducer

function querySourcesReducer(state, action) {
  switch (action.status) {
  case 'success':
    return _.defaults({
      query: action.res.body,
    }, state);
  }

  return state;
}

export function sourceReducer(state = {query: null}, action) {
  switch (action.type) {
  case types.querySources:
    return querySourcesReducer(state, action);
  }

  return state;
}
