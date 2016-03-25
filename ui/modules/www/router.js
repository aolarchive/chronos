// import

import React from 'react';
import {Provider} from 'react-redux';
import {syncHistoryWithStore} from 'react-router-redux';
import {Router, Route, Redirect, browserHistory} from 'react-router';
import store from './store';

// routes

import AppRoute from './AppRoute/AppRoute.js';
import JobUpdateRoute from './JobUpdateRoute/JobUpdateRoute.js';
import JobCreateRoute from './JobCreateRoute/JobCreateRoute.js';
import JobsRoute from './JobsRoute/JobsRoute.js';

// export

export const routes = (
  <Route component={AppRoute}>
    <Redirect path="/" to="/jobs"/>
    <Redirect path="/job" to="/jobs"/>

    <Route path="/jobs" component={JobsRoute}/>
    <Route path="/job/create" component={JobCreateRoute}/>
    <Route path="/job/:id" components={JobUpdateRoute}/>

    <Redirect path="/*" to="/jobs"/>
  </Route>
);

export default (
  <Provider store={store}>
    <Router history={syncHistoryWithStore(browserHistory, store)} routes={routes}/>
  </Provider>
);
