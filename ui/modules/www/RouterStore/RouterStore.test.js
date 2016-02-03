// import

import {routeJobs, routeJobUpdate, routeJobCreate} from './RouterStore.js';
import {expect} from 'chai';
import store from '../store.js';

// test

describe('routeJobs', () => {
  it('should redirect browser to /job/create', () => {
    routeJobCreate();
    expect(store.getState().routing.location.pathname).to.equal('/job/create');
  });

  it('should redirect browser to /job/ID', () => {
    routeJobUpdate(1);
    expect(store.getState().routing.location.pathname).to.equal('/job/1');

    routeJobUpdate({id: 2});
    expect(store.getState().routing.location.pathname).to.equal('/job/2');
  });

  it('should redirect browser to /jobs', () => {
    routeJobs();
    expect(store.getState().routing.location.pathname).to.equal('/jobs');
  });
});
