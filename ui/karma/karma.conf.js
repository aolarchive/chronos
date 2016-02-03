// import

import webpackConfig from '../webpack.config.babel.js';

// export

export default (config) => {
  config.set({
    colors: true,
    singleRun: true,
    autoWatch: false,
    logLevel: config.LOG_DISABLE,
    basePath: process.cwd(),

    browsers: [
      'PhantomJS',
    ],

    frameworks: [
      'mocha',
      'sinon-chai',
    ],

    files: [
      './node_modules/phantomjs-polyfill/bind-polyfill.js',
      './karma/karma.prep.js',
    ],

    preprocessors: {
      './karma/karma.prep.js': [
        'webpack',
        'sourcemap',
      ],

      'modules/**/*.test.js': [
        'babel',
      ],

      'modules/**/!(*.test).js': [
        'coverage',
      ],
    },

    reporters: [
      'mocha',
      'coverage',
    ],

    coverageReporter: {
      dir: './coverage',
      subdir: '.',

      reporters: [{
        type: 'html',
      }, {
        type: 'text-summary',
      }],
    },

    mochaReporter: {
      output: 'minimal',
    },

    webpack: webpackConfig,

    webpackMiddleware: {
      noInfo: true,
    },
  });
};
