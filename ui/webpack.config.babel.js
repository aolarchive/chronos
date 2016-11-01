// rules

/* eslint-disable import/no-commonjs */

// import

import path from 'path';
import webpack from 'webpack';

import postcssImport from 'postcss-import';
import postcssAutoprefixer from 'autoprefixer';
import postcssCssnano from 'cssnano';
import postcssStylelint from 'stylelint';
import postcssReporter from 'postcss-reporter';
import postcssCssnext from 'postcss-cssnext';
import postcssNested from 'postcss-nested';
import postcssHCL from 'postcss-color-hcl';
import postcssBaseline from './postcss/baseline.js';

// vars

const __PRODUCTION__ = process.env.NODE_ENV === 'production';
const __CLIENT__ = !process.env.NODE_TEST;

const entry = [
  './modules/www/app.js',
];

const include = path.join(__dirname, 'modules');

const extensions = ['', '.js', '.jsx', '.styl'];

const plugins = [
  new webpack.optimize.OccurenceOrderPlugin(),
  new webpack.HotModuleReplacementPlugin(),
  new webpack.DefinePlugin({
    __PRODUCTION__,
    __CLIENT__,
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV),
    },
  }),
];

if (__PRODUCTION__) {
  extensions.splice(1, 0, '.min.js');
} else {
  entry.splice(0, 0, 'webpack-dev-server/client?http://localhost:8000',
  'webpack/hot/only-dev-server');
}

// export

export default {
  devtool: !__PRODUCTION__ && 'eval-source-map',
  debug: false,
  entry,

  output: {
    path: path.join(__dirname, 'public'),
    publicPath: '/',
    filename: 'bundle.js',
  },

  plugins,

  resolve: {
    extensions,
    alias: {},
  },

  module: {
    preLoaders: [{
      test: /\.js$/,
      loader: __CLIENT__ ? 'eslint' : 'isparta',
      include,
    }],

    loaders: [{
      test: /font\.js$/,
      loader: 'style!css!fontgen?formats=woff,eot,ttf',
    }, {
      test: /\.jsx?$/,
      loader: 'react-hot!babel',
      include,
    }, {
      test: /\.css$/,
      loader: 'style!css?modules&localIdentName=[name]_[local]__[hash:base64:5]&importLoaders=1!postcss',
      include,
    }, {
      test: /\.json$/,
      loader: 'json',
    }],
  },

  postcss(wp) {
    return [
      postcssStylelint(),
      postcssImport({
        addDependencyTo: wp,
      }),
      postcssBaseline(),
      postcssNested(),
      postcssHCL(),
      postcssCssnext({
        features: {
          autoprefixer: false,
        },
      }),
      postcssAutoprefixer({
        browsers: ['last 2 version'],
      }),
      postcssCssnano({
        autoprefixer: false,
      }),
      postcssReporter({
        plugins: [
          '!postcss-discard-empty',
        ],
      }),
    ];
  },

  eslint: {
    configFile: '.eslintrc',
    fix: true,
  },
};
