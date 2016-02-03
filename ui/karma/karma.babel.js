#!/usr/bin/env node

'use strict';
require("babel-polyfill");
require('babel-core/register');
module.exports = require('./karma.conf.js').default;
