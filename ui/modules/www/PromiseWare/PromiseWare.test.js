// import

import promiseWare from './PromiseWare.js';
import {expect} from 'chai';
import sinon from 'sinon';

// test

describe('promiseWare', () => {
  it('should pass actions without promises onto next middleware', () => {
    const dispatch = sinon.spy();
    const next = sinon.spy();
    const ware = promiseWare({dispatch})(next);

    ware({});

    setTimeout(() => {
      expect(next.callCount).to.equal(1);
      expect(dispatch.callCount).to.equal(0);
    });
  });

  it('should dispatch resolution of promised action', () => {
    const dispatch = sinon.spy();
    const next = sinon.spy();
    const ware = promiseWare({dispatch})(next);
    const promise = Promise.resolve({});

    ware(promise);

    setTimeout(() => {
      expect(next.callCount).to.equal(0);
      expect(dispatch.callCount).to.equal(1);
    });
  });

  it('should dispatch status actions when action.promise present', () => {
    const dispatch = sinon.spy();
    const next = sinon.spy();
    const ware = promiseWare({dispatch})(next);
    const action = {
      type: 'type',
      promise: Promise.resolve({}),
    };

    ware(action);

    setTimeout(() => {
      expect(next.callCount).to.equal(0);
      expect(dispatch.callCount).to.equal(2);
      expect(dispatch.firstCall.args[0].status).to.equal('loading');
      expect(dispatch.secondCall.args[0].status).to.equal('success');
    }, 10);
  });

  it('should dispatch error status actions when action.promise rejected', () => {
    const dispatch = sinon.spy();
    const next = sinon.spy();
    const ware = promiseWare({dispatch})(next);
    const action = {
      type: 'type',
      promise: Promise.reject({}),
    };

    ware(action);

    setTimeout(() => {
      expect(next.callCount).to.equal(0);
      expect(dispatch.callCount).to.equal(2);
      expect(dispatch.firstCall.args[0].status).to.equal('loading');
      expect(dispatch.secondCall.args[0].status).to.equal('failure');
    }, 10);
  });
});
