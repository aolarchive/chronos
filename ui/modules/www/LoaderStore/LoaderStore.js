// import

import _ from 'lodash';
import {createAction} from '../ActionHelper/ActionHelper';

// actions

export const createLoader = createAction('LOADER_CREATE', ['key', 'opts']);
export const updateLoader = createAction('LOADER_UPDATE', ['key', 'opts']);
export const deleteLoader = createAction('LOADER_DELETE', ['key']);

// reducer

export function loaderReducer(state = {global: {active: true}}, action) {
  switch (action.type) {
  case 'LOADER_CREATE':
    delete state[action.key];
    return _.assign({}, state, {[action.key]: action.opts});

  case 'LOADER_UPDATE':
    _.assign(state[action.key], action.opts);
    return _.clone(state);

  case 'LOADER_DELETE':
    delete state[action.key];
    return _.clone(state);
  }

  return state;
}
