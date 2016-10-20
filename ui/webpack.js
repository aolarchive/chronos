// import

import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import config from './webpack.config.babel.js';
import proxy from 'express-http-proxy';
import url from 'url';
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
  console.log(err || 'Listening at localhost:8000');
});
