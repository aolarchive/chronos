// import

import React, {Component, PropTypes} from 'react';
import cn from 'classnames';
import styles from './FilterBar.css';

// export

export default class FilterBar extends Component {
  static propTypes = {
    children: PropTypes.any.isRequired,
    className: PropTypes.string,
  };

  render() {
    const {className, ...props} = this.props;

    return (
      <div {...props} className={cn(styles.FilterBar, className)}>
        {this.props.children}
      </div>
    );
  }
}
