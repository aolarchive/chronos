// import

import ReactDOM from 'react-dom';
import router from './router';
import './../font/font.js';
import './Styles/Core.css';

// start

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(router, document.getElementById('site-app'));
});
