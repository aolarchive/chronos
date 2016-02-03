// import

import React, {Component, PropTypes} from 'react';

// export

export default class FilterBar extends Component {
  static propTypes = {
    children: PropTypes.any.isRequired,
  };

  render() {
    return (
      <div className="filter-bar">
        {this.props.children}
      </div>
    );
  }
}
