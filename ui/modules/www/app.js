// import

import ReactDOM from 'react-dom';
import router from './router';
import './font.js';
import '../styles/index.styl';

// start

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(router, document.getElementById('site-app'));
});
