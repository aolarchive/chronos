// import

import _ from 'lodash';
import store from '../store.js';
import request from 'superagent';

// export

export function createDispatcher(actionFn) {
  return function dispatcherAction(...args) {
    return store.dispatch(actionFn(...args));
  };
}

export function createAction(type, params, payloadFn) {
  return function standardAction(...args) {
    const payload = _.zipObject(params, args);
    payload.type = type;
    return store.dispatch(payloadFn ? payloadFn(payload) : payload);
  };
}

export function createRequestAction(opts) {
  const {type, endpoint, method, requestFn, cacheFn, successFn, failureFn, loadingFn} = opts;

  return function requestAction(id, query, send) {
    if (requestFn) {
      const params = requestFn(id, query, send);
      id = params.id || id;
      query = params.query || query;
      send = params.send || send;
    }

    if (cacheFn) {
      const cache = cacheFn(id, query, send);

      if (cache) {
        return Promise.resolve(store.dispatch({type, id, query, send, cache, status: 'cached'}));
      }
    }

    const httpMethod = method === 'query' ? 'get' : method === 'delete' ? 'del' : method;
    const useId = method !== 'query' && method !== 'post' && endpoint.indexOf(':') === -1 ? '/' + id : '';

    const req = request[httpMethod](`${endpoint.replace(':id', id)}${useId}`)
    .accept('json')
    .type('json')
    .query(query)
    .send(send);

    const promise = new Promise((resolve, reject) => {
      req.end((err, res) => {
        const endAction = {type, req, id, query, send, promise, err, res};

        if (err) {
          err.response = res;

          if (failureFn) {
            failureFn(endAction);
          }

          reject(endAction);
        } else {
          if (successFn) {
            successFn(endAction);
          }

          resolve(endAction);
        }
      });
    });

    const action = {type, req, id, query, send, promise};

    if (loadingFn) {
      loadingFn(action);
    }

    store.dispatch(action);

    return promise;
  };
}
