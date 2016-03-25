// import

import CodeMirror from 'codemirror';
import _ from 'lodash';

// webpack

import 'codemirror/mode/sql/sql.js';
import 'codemirror/mode/shell/shell.js';
import 'style!css!codemirror/lib/codemirror.css';

// fns

function combineSQL(key) {
  const pls = CodeMirror.mimeModes['text/x-plsql'][key] || {};
  const hive = CodeMirror.mimeModes['text/x-hive'][key];

  return _(Object.keys(pls).concat(Object.keys(hive)))
  .uniq()
  .reduce((obj, item) => {
    obj[item] = true;
    return obj;
  }, {});
}

// config

CodeMirror.defineMIME('text/x-huffsql', {
  name: 'sql',
  keywords: combineSQL('keywords'),
  builtin: combineSQL('builtin'),
  atoms: combineSQL('atoms'),
  operatorChars: /^[*+\-%<>!=]/,
  dateSQL: combineSQL('dateSQL'),
  support: combineSQL('support'),
});

// export

export const sqlOpts = {
  lineNumbers: true,
  mode: 'text/x-huffsql',
};

export const shellOpts = {
  lineNumbers: true,
  mode: 'shell',
};
