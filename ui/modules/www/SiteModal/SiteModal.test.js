// import

import React from 'react';
import Utils from 'react-addons-test-utils';
import SiteModal from './SiteModal.js';
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

describe('SiteModal', () => {
  it('should render without issue', () => {
    const cmp = Utils.renderIntoDocument(
      <SiteModal.WrappedComponent modal={{}}/>
    );

    expect(cmp).to.exist;
  });
});

describe('Connect(SiteModal)', () => {
  it('should pass global loader to props', () => {
    const modal = {};

    const cmp = Utils.renderIntoDocument(
      <SiteModal store={getStore({modal})}/>
    );

    expect(cmp.renderedElement.props.modal).to.equal(modal);
  });
});
