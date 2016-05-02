// import

import React, {Component, PropTypes} from 'react';
import styles from './SiteLoader.css';
import {connect} from 'react-redux';
import cn from 'classnames';
import _ from 'lodash';

// vars

const sizes = ['small', 'medium', 'large', 'jumbo'];

// export

@connect((state) => {
  return {
    siteLoader: state.siteLoader,
  };
})
export default class SiteLoader extends Component {
  static propTypes = {
    className: PropTypes.string,
    siteLoader: PropTypes.object.isRequired,
    size: PropTypes.oneOf(sizes).isRequired,
  };

  static defaultProps = {
    size: _.last(sizes),
  };

  className() {
    return cn(
    styles.SiteLoader,
    this.props.className, {
      [styles.active]: this.props.siteLoader.active,
    });
  }

  render() {
    const {className, size, ...props} = this.props;

    return (
      <section {...props} className={this.className()}>
        <div className={cn(styles.loader, styles[this.props.size])}>
          <div className={styles.loaderBar}></div>
          <div className={styles.loaderBar}></div>
          <div className={styles.loaderBar}></div>
          <div className={styles.loaderBar}></div>
          <div className={styles.loaderBar}></div>
        </div>
      </section>
    );
  }
}
