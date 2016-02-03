// import

import React from 'react';
import Utils from 'react-addons-test-utils';
import JobsRoute from './JobsRoute.js';
import {expect} from 'chai';

// fns

function getStore(state) {
  return {
    subscribe() {},
    dispatch() {},
    getState() {
      return state;
    },
  };
}

function getJobs() {
  return [{
    id: 1,
    name: 'name',
    interval: 'Hourly',
    startMinute: 1,
    startHour: 1,
    startDay: 1,
  }, {
    id: 1,
    name: 'name',
    interval: 'Daily',
    startMinute: 1,
    startHour: 1,
    startDay: 1,
  }, {
    id: 1,
    name: 'name',
    interval: 'Weekly',
    startMinute: 1,
    startHour: 1,
    startDay: 1,
  }, {
    id: 1,
    name: 'name',
    interval: 'Monthly',
    startMinute: 1,
    startHour: 1,
    startDay: 1,
  }, {
    id: 1,
    name: 'different',
    interval: null,
    startMinute: 1,
    startHour: 1,
    startDay: 1,
  }];
}

// test

describe('JobsRoute', () => {
  it('should render without issue', () => {
    const cmp = Utils.renderIntoDocument(
      <JobsRoute.WrappedComponent loader={{active: true}}/>
    );

    expect(cmp).to.exist;
  });

  it('should filter jobs using filter bar', () => {
    const cmp = Utils.renderIntoDocument(
      <JobsRoute.WrappedComponent jobs={getJobs()} loader={{active: true}}/>
    );

    expect(Utils.scryRenderedDOMComponentsWithClass(cmp, 'jobs-list-name')).to.have.length(6);

    Utils.Simulate.change(Utils.findRenderedDOMComponentWithClass(cmp, 'jobs-filter-text'), {
      target: {
        value: 'name',
      },
    });

    expect(Utils.scryRenderedDOMComponentsWithClass(cmp, 'jobs-list-name')).to.have.length(5);
  });
});

describe('Connect(JobsRoute)', () => {
  it('should pass global loader to props', () => {
    const loader = {active: true};

    const cmp = Utils.renderIntoDocument(
      <JobsRoute store={getStore({
        loader: {
          global: loader,
        },
        jobs: {
          query: [],
        },
      })} routeParams={{id: 1}}/>
    );

    expect(cmp.renderedElement.props.loader).to.equal(loader);
  });

  it('should pass queried jobs to props', () => {
    const jobs = [];

    const cmp = Utils.renderIntoDocument(
      <JobsRoute store={getStore({
        loader: {
          global: null,
        },
        jobs: {
          query: jobs,
        },
      })} routeParams={{id: 1}}/>
    );

    expect(cmp.renderedElement.props.jobs).to.equal(jobs);
  });
});
