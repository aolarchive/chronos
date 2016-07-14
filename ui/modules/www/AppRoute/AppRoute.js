// import

import React, {Component, PropTypes} from 'react';
import SiteHeader from '../SiteHeader/SiteHeader.js';
import SiteModal from '../SiteModal/SiteModal.js';
import SiteLoader from '../SiteLoader/SiteLoader.js';
import SiteMessages from '../SiteMessages/SiteMessages.js';
import styles from './AppRoute.css';
import shared from '../Styles/Shared.css';
import cn from 'classnames';

// export

export default class AppRoute extends Component {
  static propTypes = {
    children: PropTypes.element.isRequired,
  };

  render() {
    const {children} = this.props;
    
    return (
      <div className={cn(styles.AppRoute, shared.clearfix)}>
        <SiteHeader/>

        {children}

        <SiteModal/>
        <SiteLoader/>
        <SiteMessages/>
      </div>
    );
  }
}
