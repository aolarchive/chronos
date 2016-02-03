// import

import React from 'react';
import {Provider} from 'react-redux';
import {Router, Route, Redirect, browserHistory} from 'react-router';
import store from './store';

// routes

import AppRoute from './AppRoute/AppRoute';
import JobUpdateRoute from './JobUpdateRoute/JobUpdateRoute';
import JobCreateRoute from './JobCreateRoute/JobCreateRoute';
import JobsRoute from './JobsRoute/JobsRoute';
import RunsList from './RunsList/RunsList';

// export

export const routes = (
  <Route component={AppRoute}>
    <Redirect path="/" to="/jobs"/>
    <Redirect path="/job" to="/jobs"/>

    <Route path="/jobs" components={{main: JobsRoute, side: RunsList}} mainClassName="route-main-jobs" sideClassName="route-side-runs route-side-runs-all"/>
    <Route path="/job/create" components={{main: JobCreateRoute, side: RunsList}} mainClassName="route-main-job route-main-job-create" sideClassName="route-side-runs route-side-runs-one"/>
    <Route path="/job/:id" components={{main: JobUpdateRoute, side: RunsList}} mainClassName="route-main-job route-main-job-update" sideClassName="route-side-runs route-side-runs-one"/>

    <Redirect path="/*" to="/jobs"/>
  </Route>
);

export default (
  <Provider store={store}>
    <Router history={browserHistory} routes={routes}/>
  </Provider>
);
