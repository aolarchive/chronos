// import

import React, {Component, PropTypes} from 'react';
import {Link} from 'react-router';
import styles from './SiteHeader.css';
import cn from 'classnames';
import {connect} from 'react-redux';
import {setItem} from '../LocalStorageStore/LocalStorageStore.js';
import {createModal} from '../SiteModalStore/SiteModalStore.js';
import SettingsModal from '../SettingsModal/SettingsModal.js';

// export

@connect((state) => {
  return {
    hideSidebar: state.localStorage.hideSidebar === 'true',
    settings: state.localStorage,
  };
})
export default class SiteHeader extends Component {
  static propTypes = {
    hideSidebar: PropTypes.bool.isRequired,
    settings: PropTypes.object.isRequired,
  };

  toggleSidebar() {
    setItem('hideSidebar', this.props.hideSidebar ? 'false' : 'true');
  }

  toggleSettings() {
    createModal({
      title: 'Settings',
      component: SettingsModal,
      props: {
        settings: this.props.settings,
      },
    });
  }

  render() {
    const {hideSidebar} = this.props;

    return (
      <section className={styles.SiteHeader}>
        <Link to="/" className={cn(styles.logo, 'icon icon-chronos')}/>

        <nav className={styles.links}>
          <Link to="/jobs" className={styles.link} activeClassName={styles.active}>jobs</Link>
          <Link to="/job/create" className={styles.link} activeClassName={styles.active}>new job</Link>
        </nav>

        <div className={styles.actions}>
          <div className={cn(styles.action, {[styles.enabled]: !hideSidebar})} onClick={::this.toggleSidebar}>
            <span className="icon icon-sidebar"/>
          </div>

          <div className={cn(styles.action, styles.enabled)} onClick={::this.toggleSettings}>
            <span className="icon icon-settings"/>
          </div>
        </div>
      </section>
    );
  }
}
