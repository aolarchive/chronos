// import

import React, {Component, PropTypes} from 'react';
import cn from 'classnames';
import {connect} from 'react-redux';
import {createModal, updateModal, deleteModal} from '../SiteModalStore/SiteModalStore.js';
import styles from './SiteModal.css';

// export

@connect((state) => {
  return {
    modal: state.siteModal,
  };
})
export default class SiteModal extends Component {
  static propTypes = {
    className: PropTypes.string,
    modal: PropTypes.object.isRequired,
  };

  className() {
    return cn(
      styles.SiteModal,
      this.props.className, {
        [styles.active]: this.props.modal.component,
      }
    );
  }

  handleClick() {
    if (this.props.modal.preventEscape) {
      return;
    }

    deleteModal();
  }

  render() {
    const {className, modal, ...props} = this.props;

    return (
      <section {...props} className={this.className()}>
        <div className={styles.background} onClick={this::this.handleClick}/>

        {modal.component ? (
          <div className={styles.float}>
            <div className={styles.item}>
              {modal.title ? (
                <header className={styles.head}>
                  {modal.title}
                </header>
              ) : null}

              <div className={styles.body}>
                <modal.component {...this.props.modal.props} actions={{createModal, updateModal, deleteModal}}/>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    );
  }
}
