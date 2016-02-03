// import

import React from 'react';
import Utils from 'react-addons-test-utils';
import JobForm from './JobForm.js';
import {expect} from 'chai';

// vars

const noop = () => {};

const fields = ['enabled', 'name', 'description', 'driver', 'user', 'password', 'interval', 'startDay', 'startHour', 'startMinute', 'resultEmail', 'statusEmail', 'id', 'lastModified', 'query', 'resultQuery', 'type'];

// fns

function getFields() {
  return fields.reduce((obj, field) => {
    obj[field] = {};
    return obj;
  }, {});
}

// test

describe('JobForm', () => {
  it('should render without error', () => {
    const cmp = Utils.renderIntoDocument(
      <JobForm.WrappedComponent
        deletedJobs={[]}
        fields={getFields()}
        handleSubmit={noop}
        initializeForm={noop}
        formKey={'create'}
        loader={{active: true}}
        resetForm={noop}
      />
    );

    expect(cmp).to.exist;
  });

  it('should show the right query based on state.query', () => {
    const cmp = Utils.renderIntoDocument(
      <JobForm.WrappedComponent
        deletedJobs={[]}
        fields={getFields()}
        handleSubmit={noop}
        initializeForm={noop}
        formKey={'create'}
        loader={{active: true}}
        resetForm={noop}
      />
    );

    const toggles = Utils.scryRenderedDOMComponentsWithClass(cmp, 'job-edit-code-toggle');

    expect(toggles[0].className).to.include('active');

    Utils.Simulate.click(toggles[1]);

    expect(toggles[1].className).to.include('active');
  });
});
