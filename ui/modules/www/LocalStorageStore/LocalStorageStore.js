// import

import _ from 'lodash';
import {createAction} from '../ActionHelper/ActionHelper';

// types

export const types = {
  get: 'LOCALSTORAGE_GET',
  set: 'LOCALSTORAGE_SET',
  remove: 'LOCALSTORAGE_REMOVE',
};

// actions
export const setItem = createAction(types.set, ['key', 'val']);
export const removeItem = createAction(types.remove, ['key']);

// reducer

const initialState = {};

if (window.localStorage) {
  for (const key in localStorage) {
    initialState[key] = localStorage.getItem(key);
  }
}

export function localStorageReducer(state = initialState, action) {
  const {key, val} = action;

  switch (action.type) {
  case types.set:
    try {
      state[key] = val;
      localStorage.setItem(key, val);
    } catch (e) {
      console.warn(e);
    }

    return _.clone(state);

  case types.remove:
    try {
      delete state[key];
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(e);
    }

    return _.clone(state);
  }

  return state;
}
