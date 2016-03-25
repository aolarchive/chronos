// rules

/* global __PRODUCTION__ */
/* global __CLIENT__ */

// import

import {combineReducers, createStore, applyMiddleware, compose} from 'redux';
import {browserHistory} from 'react-router';
import thunkWare from 'redux-thunk';
import createLogger from 'redux-logger';
import promiseWare from './PromiseWare/PromiseWare.js';

// config

import {reducer as formReducer} from 'redux-form';
import {siteLoaderReducer} from './SiteLoaderStore/SiteLoaderStore.js';
import {siteModalReducer} from './SiteModalStore/SiteModalStore.js';
import {runReducer} from './RunStore/RunStore.js';
import {jobsReducer} from './JobsStore/JobsStore.js';
import {sourceReducer} from './SourceStore/SourceStore.js';
import {messageReducer} from './MessageStore/MessageStore.js';
import {routerReducer, routerMiddleware} from 'react-router-redux';
import {localStorageReducer} from './LocalStorageStore/LocalStorageStore.js';

const reducers = {
  routing: routerReducer,
  form: formReducer,

  siteLoader: siteLoaderReducer,
  siteModal: siteModalReducer,
  message: messageReducer,
  localStorage: localStorageReducer,

  runs: runReducer,
  jobs: jobsReducer,
  sources: sourceReducer,
};

// ware

const ware = [
  thunkWare,
  promiseWare,
  routerMiddleware(browserHistory),
];

if (!__PRODUCTION__ && __CLIENT__) {
  ware.unshift(createLogger({
    duration: true,
    collapsed: true,
  }));
}

// export

export default compose(
  applyMiddleware(...ware)
)(createStore)(combineReducers(reducers), {});
