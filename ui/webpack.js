// import

const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const config = require('./webpack.config.babel.js');
const proxy = require('express-http-proxy');
const url = require('url');
import dotenv from 'dotenv';

// env

dotenv.load();

// config

const server = new WebpackDevServer(webpack(config), {
  publicPath: config.output.publicPath,
  contentBase: './public',
  hot: true,
  historyApiFallback: true,
  quiet: false,
  noInfo: true,
  stats: {
    colors: true,
  },
});

if (process.env.CHRONOS_PROXY_URL) {
  server.use('/api', proxy(process.env.CHRONOS_PROXY_URL, {
    forwardPath(req) {
      return '/api' + url.parse(req.url).path;
    },
  }));
}

// run

server.listen(8000, 'localhost', (err) => {
  if (err) {
    return console.log(err);
  }

  console.log('Listening at localhost:8000');
});
