// import

import {createDispatcher} from '../ActionHelper/ActionHelper';
import {routerActions} from 'react-router-redux';

// actions

export const routeJobs = createDispatcher(() => {
  return routerActions.push({pathname: '/jobs'});
});

export const routeJobUpdate = createDispatcher((job) => {
  return routerActions.push({pathname: '/job/' + (job.id || job)});
});

export const routeJobCreate = createDispatcher(() => {
  return routerActions.push({pathname: '/job/create'});
});
