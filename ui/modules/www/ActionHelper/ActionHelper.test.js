// import

import {createAction, createRequestAction} from './ActionHelper.js';
import {expect} from 'chai';
import sinon from 'sinon';

// test

describe('createAction()', () => {
  it('should accept payloadFn to transform action before dispatch', () => {
    const spy = sinon.spy(() => {
      return {type: 'type'};
    });
    const action = createAction('type', [], spy);

    action();

    expect(spy.callCount).to.equal(1);
  });
});

describe('createRequestAction()', () => {
  it('should accept requestFn to transform {id, query, send} before request', () => {
    createRequestAction({
      type: 'type',
      method: 'get',
      endpoint: '/',
      requestFn() {
        return {
          id: 1,
          query: 2,
          send: 3,
        };
      },
    })().then((action) => {
      expect(action.id).to.equal(1);
      expect(action.query).to.equal(2);
      expect(action.send).to.equal(3);
    });
  });

  it('should allow requestFn to transform only some params', () => {
    createRequestAction({
      type: 'type',
      method: 'get',
      endpoint: '/',
      requestFn() {
        return {id: 1};
      },
    })(null, null, null).then((action) => {
      expect(action.id).to.equal(1);
      expect(action.query).to.equal(null);
      expect(action.send).to.equal(null);
    });

    createRequestAction({
      type: 'type',
      method: 'get',
      endpoint: '/',
      requestFn() {
        return {query: 2};
      },
    })(null, null, null).then((action) => {
      expect(action.id).to.equal(null);
      expect(action.query).to.equal(2);
      expect(action.send).to.equal(null);
    });

    createRequestAction({
      type: 'type',
      method: 'get',
      endpoint: '/',
      requestFn() {
        return {send: 3};
      },
    })(null, null, null).then((action) => {
      expect(action.id).to.equal(null);
      expect(action.query).to.equal(null);
      expect(action.send).to.equal(3);
    });
  });

  it('should accept cacheFn to which might end request early', () => {
    createRequestAction({
      type: 'type',
      method: 'get',
      endpoint: '/',
      cacheFn() {
        return true;
      },
    })().then((action) => {
      expect(action.status).to.equal('cached');
      expect(action.cache).to.equal(true);
    });

    createRequestAction({
      type: 'type',
      method: 'get',
      endpoint: '/',
      cacheFn() {
        return false;
      },
    })().then((action) => {
      expect(action.status).to.equal('success');
      expect(action).not.to.have.property('cache');
    });
  });
});
