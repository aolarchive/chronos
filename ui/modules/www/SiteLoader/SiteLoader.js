// import

import React, {Component, PropTypes} from 'react';
import cn from 'classnames';
import {connect} from 'react-redux';

// export

@connect((state) => {
  return {
    loader: state.loader,
  };
})
export default class SiteLoader extends Component {
  static propTypes = {
    className: PropTypes.string,
    loader: PropTypes.object.isRequired,
  };

  className() {
    return cn(
      this.props.className,
      'site-loader',
      {
        'active': this.props.loader.global.active,
      }
    );
  }

  render() {
    const {loader, ...props} = this.props;

    return (
      <section {...props} id="site-loader" className={this.className()}>
        <div className="loader jumbo">
          <div className="loader-bar"></div>
          <div className="loader-bar"></div>
          <div className="loader-bar"></div>
          <div className="loader-bar"></div>
          <div className="loader-bar"></div>
        </div>
      </section>
    );
  }
}
