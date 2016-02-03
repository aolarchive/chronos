// import

import React, {Component} from 'react';
import {Link} from 'react-router';

// export

export default class SiteHeader extends Component {
  render() {
    return (
      <section id="site-header" className="site-header area-gradient">
        <Link to="/" id="site-header-logo" className="site-header-logo icon icon-chronos"/>

        <nav id="site-header-links" className="site-header-links">
          <Link to="/jobs" className="site-header-link">jobs</Link>
          <Link to="/job/create" className="site-header-link">new job</Link>
        </nav>
      </section>
    );
  }
}
