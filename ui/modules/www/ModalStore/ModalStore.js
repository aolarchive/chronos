// import

import _ from 'lodash';
import {createAction} from '../ActionHelper/ActionHelper';

// actions

export const createModal = createAction('MODAL_CREATE', ['opts']);
export const updateModal = createAction('MODAL_UPDATE', ['opts']);
export const deleteModal = createAction('MODAL_DELETE');

// reducer

const initialState = {};

export function modalReducer(state = initialState, action) {
  switch (action.type) {
  case 'MODAL_CREATE':
    return _.assign({}, initialState, action.opts);

  case 'MODAL_UPDATE':
    return _.assign({}, state, action.opts);

  case 'MODAL_DELETE':
    return _.clone(initialState);
  }

  return state;
}
