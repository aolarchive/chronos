// import

import React, {Component, PropTypes} from 'react';
import SiteHeader from '../SiteHeader/SiteHeader';
import SiteModal from '../SiteModal/SiteModal';
import SiteLoader from '../SiteLoader/SiteLoader';
import SiteMessages from '../SiteMessages/SiteMessages';
import cn from 'classnames';

// export

export default class AppRoute extends Component {
  static propTypes = {
    main: PropTypes.element.isRequired,
    side: PropTypes.element,
  };

  static contextTypes = {
    store: PropTypes.object.isRequired,
  };

  static childContextTypes = {
    store: PropTypes.object.isRequired,
  };

  getChildContext() {
    return {
      store: this.context.store,
    };
  }

  mainClassName() {
    return cn(
      this.props.main.props.route.mainClassName,
      'site-main',
      {
        'site-main-full': !this.props.side,
      }
    );
  }

  sideClassName() {
    return cn(
      this.props.side.props.route.sideClassName,
      'site-side'
    );
  }

  render() {
    const {main, side, ...props} = this.props;

    return (
      <div id="site-page" className="site-page">
        <SiteHeader/>

        <section id="site-main" className={this.mainClassName()}>
          {main}
        </section>

        {side && <section id="site-side" className={this.sideClassName()}>{side}</section>}

        <SiteModal/>
        <SiteLoader/>
        <SiteMessages/>
      </div>
    );
  }
}
