// import

import React from 'react';
import Utils from 'react-addons-test-utils';
import SiteLoader from './SiteLoader.js';
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

// test

describe('SiteLoader', () => {
  it('should render without issue', () => {
    const cmp = Utils.renderIntoDocument(
      <SiteLoader.WrappedComponent loader={{global: {active: true}}}/>
    );

    expect(cmp).to.exist;
  });
});

describe('Connect(SiteLoader)', () => {
  it('should pass global loader to props', () => {
    const loader = {global: {active: true}};

    const cmp = Utils.renderIntoDocument(
      <SiteLoader store={getStore({loader})}/>
    );

    expect(cmp.renderedElement.props.loader).to.equal(loader);
  });
});
