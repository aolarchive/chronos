// import

import React from 'react';
import Utils from 'react-addons-test-utils';
import SiteHeader from './SiteHeader.js';
import {expect} from 'chai';

// test

describe('SiteHeader', () => {
  it('should render without error', () => {
    const cmp = Utils.renderIntoDocument(
      <SiteHeader/>
    );

    expect(cmp).to.exist;
  });
});
