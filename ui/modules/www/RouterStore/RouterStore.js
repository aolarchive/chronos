// import

import {createDispatcher} from '../ActionHelper/ActionHelper';
import {routeActions} from 'react-router-redux';

// actions

export const routeJobs = createDispatcher(() => {
  return routeActions.push({pathname: '/jobs'});
});

export const routeJobUpdate = createDispatcher((job) => {
  return routeActions.push({pathname: '/job/' + (job.id || job)});
});

export const routeJobCreate = createDispatcher(() => {
  return routeActions.push({pathname: '/job/create'});
});
