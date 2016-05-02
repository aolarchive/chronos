// import

import React, {Component, PropTypes} from 'react';
import {Link} from 'react-router';
import styles from './SiteHeader.css';
import cn from 'classnames';
import {connect} from 'react-redux';
import {setItem} from '../LocalStorageStore/LocalStorageStore.js';

// export

@connect((state) => {
  return {
    hideSidebar: state.localStorage.hideSidebar === 'true',
  };
})
export default class SiteHeader extends Component {
  static propTypes = {
    hideSidebar: PropTypes.bool.isRequired,
  };

  toggleSidebar() {
    setItem('hideSidebar', this.props.hideSidebar ? 'false' : 'true');
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
        </div>
      </section>
    );
  }
}
