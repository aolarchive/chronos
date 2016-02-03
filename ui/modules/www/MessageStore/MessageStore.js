// import

import _ from 'lodash';
import {createAction} from '../ActionHelper/ActionHelper';

// actions

export const createMessage = createAction('MESSAGE_CREATE', ['msg']);
export const createRequestMessage = createAction('MESSAGE_CREATE_REQUEST', ['err', 'res', 'msg']);
export const wipeMessages = createAction('MESSAGE_WIPE');

// reducer

const initialState = {
  queue: [],
};

export function messageReducer(state = initialState, action) {
  switch (action.type) {
  case 'MESSAGE_CREATE':
    return _.assign({}, state, {queue: state.queue.concat(action.msg)});

  case 'MESSAGE_CREATE_REQUEST':
    const res = _.isArray(action.res) ? _.last(action.res) : action.res;
    const err = res.body || res.error.message;

    return _.assign({}, state, {queue: state.queue.concat({
      level: action.err ? 'error' : 'success',
      title: `${action.msg.title}  ${action.err ? 'Failed' : 'Succeeded'}`,
      message: action.err ? action.msg.error || err : action.msg.message,
    })});

  case 'MESSAGE_WIPE':
    return _.assign({}, state, {queue: []});
  }

  return state;
}
