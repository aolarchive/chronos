// import

import React from 'react';
import ReactDOM from 'react-dom';
import Utils from 'react-addons-test-utils';
import RunsList from './RunsList.js';
import {expect} from 'chai';
import sinon from 'sinon';
import _ from 'lodash';

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

function getJob() {
  return {
    id: 1,
  };
}

function getRunsLast() {
  return _.fill(Array(2), {
    jobId: 1,
    start: 12345000,
    finish: 12345000,
    success: 12345000,
    plannedJob: {
      jobSpec: {
        id: 1,
        name: 'name',
      },
    },
  }).concat({
    jobId: 1,
    start: 12345000,
    finish: 12345000,
    success: null,
    exceptionMessage: 'error',
    plannedJob: {
      jobSpec: {
        id: 1,
        name: 'name',
      },
    },
  });
}

function getRunsNext() {
  return _.fill(Array(3), {
    time: 12345000,
  });
}

// test

describe('RunsList', () => {
  it('should render without issue', () => {
    const cmp = Utils.renderIntoDocument(
      <RunsList.WrappedComponent routeParams={{id: 1}}/>
    );

    expect(cmp).to.exist;
  });

  it('should render a list of previous runs when state.last == true', () => {
    const lastRuns = getRunsLast();
    const nextRuns = getRunsNext();

    const cmp = Utils.renderIntoDocument(
      <RunsList.WrappedComponent job={null} last={lastRuns} next={nextRuns} routeParams={{}}/>
    );

    const found = Utils.scryRenderedDOMComponentsWithClass(cmp, 'action-view');

    expect(found.length).to.equal(3);
  });

  it('should render a list of previous runs when state.last == false', () => {
    const lastRuns = getRunsLast();
    const nextRuns = getRunsNext();

    const cmp = Utils.renderIntoDocument(
      <RunsList.WrappedComponent job={null} last={lastRuns} next={nextRuns} routeParams={{}}/>
    );

    Utils.Simulate.click(Utils.scryRenderedDOMComponentsWithClass(cmp, 'runs-list-nav-link').pop());

    const found = Utils.scryRenderedDOMComponentsWithClass(cmp, 'runs-list-item-header');
    const foundViews = Utils.scryRenderedDOMComponentsWithClass(cmp, 'action-view');

    expect(found.length).to.equal(3);
    expect(foundViews.length).to.equal(0);
  });

  it('should toggle state.last with buttons', () => {
    const lastRuns = getRunsLast();
    const nextRuns = getRunsNext();

    const cmp = Utils.renderIntoDocument(
      <RunsList.WrappedComponent job={null} last={lastRuns} next={nextRuns} routeParams={{}}/>
    );

    const [toLast, toFirst] = Utils.scryRenderedDOMComponentsWithClass(cmp, 'runs-list-nav-link');

    expect(cmp.state.last).to.equal(true);

    Utils.Simulate.click(toFirst);

    expect(cmp.state.last).to.equal(false);

    Utils.Simulate.click(toLast);

    expect(cmp.state.last).to.equal(true);
  });

  it('should only reload data on componentDidUpdate when changing browser location', () => {
    const job = getJob();
    const lastRuns = getRunsLast();
    const nextRuns = getRunsNext();

    const spy = sinon.spy(RunsList.WrappedComponent.prototype, 'tick');

    const node = document.createElement('div');
    ReactDOM.render((
      <RunsList.WrappedComponent job={null} last={lastRuns} next={nextRuns} routeParams={{}}/>
    ), node);

    expect(spy.callCount).to.equal(1);

    ReactDOM.render((
      <RunsList.WrappedComponent job={null} last={lastRuns} next={nextRuns} routeParams={{id: 1}}/>
    ), node);

    expect(spy.callCount).to.equal(2);

    const cmp = ReactDOM.render((
      <RunsList.WrappedComponent job={job} last={lastRuns} next={nextRuns} routeParams={{id: 1}}/>
    ), node);

    expect(spy.callCount).to.equal(3);

    Utils.Simulate.click(Utils.scryRenderedDOMComponentsWithClass(cmp, 'runs-list-nav-link').pop());

    expect(spy.callCount).to.equal(4);

    ReactDOM.render((
      <RunsList.WrappedComponent job={job} last={getRunsLast()} next={nextRuns} routeParams={{id: 1}}/>
    ), node);

    expect(spy.callCount).to.equal(4);
  });

  it('should destroy the interval function when destroyed', () => {
    const lastRuns = getRunsLast();
    const nextRuns = getRunsNext();

    const node = document.createElement('div');
    const cmp = ReactDOM.render((
      <RunsList.WrappedComponent job={null} last={lastRuns} next={nextRuns} routeParams={{}}/>
    ), node);

    ReactDOM.unmountComponentAtNode(node);

    expect(cmp.interval).to.equal(null);
  });
});

describe('Connect(RunsList)', () => {
  it('should set props based job if routeParams.id available', () => {
    const job = getJob();
    const lastRuns = getRunsLast();
    const nextRuns = getRunsNext();

    const cmp = Utils.renderIntoDocument(
      <RunsList store={getStore({
        jobs: {
          jobs: {
            '1': job,
          },
        },
        runs: {
          jobs: {
            '1': {
              last: lastRuns,
              next: nextRuns,
            },
          },
        },
      })} routeParams={{id: 1}}/>
    );

    expect(cmp.renderedElement.props.job).to.equal(job);
    expect(cmp.renderedElement.props.last).to.equal(lastRuns);
    expect(cmp.renderedElement.props.next).to.equal(nextRuns);
  });

  it('should pass nulls if job-specific runs unavailable', () => {
    const cmp = Utils.renderIntoDocument(
      <RunsList store={getStore({
        jobs: {
          jobs: {
            '1': getJob(),
          },
        },
        runs: {
          jobs: {},
        },
      })} routeParams={{id: 1}}/>
    );

    expect(cmp.renderedElement.props.last).to.equal(null);
    expect(cmp.renderedElement.props.next).to.equal(null);
  });

  it('should set props for global if routeParams.id unavailable', () => {
    const lastRuns = getRunsLast();
    const nextRuns = getRunsNext();

    const cmp = Utils.renderIntoDocument(
      <RunsList store={getStore({
        runs: {
          last: lastRuns,
          next: nextRuns,
        },
      })} routeParams={{}}/>
    );

    expect(cmp.renderedElement.props.job).to.equal(null);
    expect(cmp.renderedElement.props.last).to.equal(lastRuns);
    expect(cmp.renderedElement.props.next).to.equal(nextRuns);
  });

  it('should call view dispatcher on view button click', () => {
    const lastRuns = getRunsLast();
    const nextRuns = getRunsNext();

    let spy = null;
    const viewFn = RunsList.WrappedComponent.prototype.view;

    RunsList.WrappedComponent.prototype.view = (run) => {
      spy = sinon.spy(viewFn(run));
      return spy;
    };

    const cmp = Utils.renderIntoDocument(
      <RunsList store={getStore({
        runs: {
          last: lastRuns,
          next: nextRuns,
        },
      })} routeParams={{}}/>
    );

    Utils.Simulate.click(Utils.scryRenderedDOMComponentsWithClass(cmp, 'action-view').pop());

    expect(spy.callCount).to.equal(1);
  });

  it('should call rerun dispatcher on rerun button click', () => {
    const lastRuns = getRunsLast();
    const nextRuns = getRunsNext();

    let spy = null;
    const rerunFn = RunsList.WrappedComponent.prototype.rerun;

    RunsList.WrappedComponent.prototype.rerun = (run) => {
      spy = sinon.spy(rerunFn(run));
      return spy;
    };

    const cmp = Utils.renderIntoDocument(
      <RunsList store={getStore({
        runs: {
          last: lastRuns,
          next: nextRuns,
        },
      })} routeParams={{}}/>
    );

    Utils.Simulate.click(Utils.scryRenderedDOMComponentsWithClass(cmp, 'action-rerun').pop());

    expect(spy.callCount).to.equal(1);
  });
});
