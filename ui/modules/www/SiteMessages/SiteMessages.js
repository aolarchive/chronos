// import

import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';
import classNames from 'classnames';
import _ from 'lodash';
import {wipeMessages} from '../MessageStore/MessageStore';
import NotificationSystem from 'react-notification-system';

// vars

const style = {
  position: 'absolute',
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,

  Containers: {
    DefaultStyle: {
      position: 'absolute',
    },
  },

  NotificationItem: {
    DefaultStyle: {
      fontSize: 'inherit',
      boxShadow: '',
    },
  },

  Title: {
    DefaultStyle: {
      fontSize: 'inherit',
    },
  },
};

const defaultMsg = {
  level: 'info',
  autoDismiss: 4,
};

// export

@connect((state) => {
  return {
    message: state.message,
  };
})
export default class SiteMessages extends Component {
  static propTypes = {
    className: PropTypes.string,
    message: PropTypes.object.isRequired,
  };

  componentDidUpdate() {
    if (this.props.message.queue.length) {
      this.props.message.queue.forEach((msg) => {
        this.refs.system.addNotification(_.defaults(msg, defaultMsg));
      });

      wipeMessages();
    }
  }

  className() {
    return classNames('site-messages', this.props.className);
  }

  render() {
    return (
      <section className={this.className()}>
        <NotificationSystem ref="system" style={style}/>
      </section>
    );
  }
}
