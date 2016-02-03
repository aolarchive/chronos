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
import {loaderReducer} from './LoaderStore/LoaderStore.js';
import {modalReducer} from './ModalStore/ModalStore.js';
import {runReducer} from './RunStore/RunStore.js';
import {jobReducer} from './JobStore/JobStore.js';
import {sourceReducer} from './SourceStore/SourceStore.js';
import {messageReducer} from './MessageStore/MessageStore.js';
import {routeReducer, syncHistory} from 'react-router-redux';

const reducers = {
  routing: routeReducer,
  form: formReducer,

  loader: loaderReducer,
  modal: modalReducer,
  message: messageReducer,

  runs: runReducer,
  jobs: jobReducer,
  sources: sourceReducer,
};

// ware

const reduxWare = syncHistory(browserHistory);

const ware = [
  thunkWare,
  promiseWare,
  reduxWare,
];

if (!__PRODUCTION__ && __CLIENT__) {
  ware.unshift(createLogger({
    duration: true,
    collapsed: true,
  }));
}

// export

const store = compose(
  applyMiddleware(...ware)
)(createStore)(combineReducers(reducers), {});

if (!__PRODUCTION__ && __CLIENT__) {
  reduxWare.listenForReplays(store);
}

export default store;
