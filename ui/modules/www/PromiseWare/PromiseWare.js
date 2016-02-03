// fns

function isPromise(val) {
  return val && typeof val.then === 'function';
}

// export

export default function promiseWare({dispatch}) {
  return (next) => {
    return (action) => {
      if (isPromise(action)) {
        return action.then(dispatch);
      }

      const {promise, ...rest} = action;

      if (!isPromise(promise)) {
        return next(action);
      }

      dispatch({...rest, status: 'loading'});

      return promise.then(({res}) => {
        dispatch({...rest, res, status: 'success'});
      }, ({err, res}) => {
        dispatch({...rest, err, res, status: 'failure'});
      });
    };
  };
}
