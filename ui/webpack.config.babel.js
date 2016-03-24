// import

import path from 'path';
import webpack from 'webpack';

import postcssAutoprefixer from 'autoprefixer';

// vars

const __PRODUCTION__ = process.env.NODE_ENV === 'production';
const __CLIENT__ = !process.env.NODE_TEST;

const entry = [
  './modules/www/app',
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

module.exports = {
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
      test: /\.styl$/,
      loader: 'style!css!postcss!stylus',
    }, {
      test: /\.css$/,
      loader: 'style!css!postcss',
    }, {
      test: /\.json$/,
      loader: 'json',
    }],
  },

  stylus: {
    use: [require('nib')()],
  },

  postcss() {
    return [
      postcssAutoprefixer({
        browsers: ['last 2 version'],
      }),
    ];
  },

  eslint: {
    configFile: '.eslintrc',
    fix: true,
  },
};
