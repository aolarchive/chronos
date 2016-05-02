// import

import _ from 'lodash';
import {createAction} from '../ActionHelper/ActionHelper.js';

// constants

export const siteLoaderConstants = {
  enable: 'SITE_LOADER_ENABLE',
  disable: 'SITE_LOADER_DISABLE',
};

// actions

export const enableSiteLoader = createAction(siteLoaderConstants.enable, ['reason']);
export const disableSiteLoader = createAction(siteLoaderConstants.disable, ['reason']);

// reducer

const initialState = {
  active: false,
  reasons: [],
};

export function siteLoaderReducer(state = initialState, action) {
  switch (action.type) {
  case siteLoaderConstants.enable:
    if (action.reason && !_.includes(state.reasons, action.reason)) {
      state.reasons = state.reasons.concat(action.reason);
    }

    state.active = !!state.reasons.length;
    return _.clone(state);

  case siteLoaderConstants.disable:
    if (!state.active) {
      return state;
    }

    if (_.isBoolean(action.reason)) {
      state.reasons = [];
    } else if (action.reason && _.includes(state.reasons, action.reason)) {
      state.reasons = _.pull(state.reasons, action.reason).slice();
    }

    state.active = !!state.reasons.length;
    return _.clone(state);
  }

  return state;
}
