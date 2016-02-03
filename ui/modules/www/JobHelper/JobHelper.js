// import

import _ from 'lodash';

// export

export function jobToClient(job) {
  return _.assign(job, {
    resultEmail: _.isArray(job.resultEmail) ? job.resultEmail.map((line) => {
      return line.trim();
    }).join('\n') : '',
    statusEmail: _.isArray(job.statusEmail) ? job.statusEmail.map((line) => {
      return line.trim();
    }).join('\n') : '',
  });
}

export function jobToServer(job) {
  return _.assign(job, {
    resultEmail: _.isString(job.resultEmail) ? job.resultEmail.split('\n').map((line) => {
      return line.trim();
    }) : [],
    statusEmail: _.isString(job.statusEmail) ? job.statusEmail.split('\n').map((line) => {
      return line.trim();
    }) : [],
  });
}
