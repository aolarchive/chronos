// import

import React from 'react';
import Utils from 'react-addons-test-utils';
import SiteMessages from './SiteMessages.js';
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

describe('SiteMessages', () => {
  it('should render without issue', () => {
    const cmp = Utils.renderIntoDocument(
      <SiteMessages.WrappedComponent message={{queue: []}}/>
    );

    expect(cmp).to.exist;
  });
});

describe('Connect(SiteMessages)', () => {
  it('should pass global loader to props', () => {
    const message = {queue: []};

    const cmp = Utils.renderIntoDocument(
      <SiteMessages store={getStore({message})}/>
    );

    expect(cmp.renderedElement.props.message).to.equal(message);
  });
});
