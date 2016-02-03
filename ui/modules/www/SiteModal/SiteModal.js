// import

import React, {Component, PropTypes} from 'react';
import cn from 'classnames';
import {connect} from 'react-redux';
import {createModal, updateModal, deleteModal} from '../ModalStore/ModalStore';

// export

@connect((state) => {
  return {
    modal: state.modal,
  };
})
export default class SiteModal extends Component {
  static propTypes = {
    className: PropTypes.string,
    modal: PropTypes.object.isRequired,
  };

  className() {
    return cn(
      this.props.className,
      'site-modal',
      {
        'active': this.props.modal.component,
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
    const {...props} = this.props;

    return (
      <section {...props} id="site-modal" className={this.className()}>
        <div className="site-modal-background" onClick={this::this.handleClick}/>

        {this.props.modal.component &&
        <div className="site-modal-float">
          <div className="site-modal-item">
            {this.props.modal.title &&
            <header className="site-modal-head">
              {this.props.modal.title}
            </header>}

            <div className="site-modal-body">
              <this.props.modal.component {...this.props.modal.props} actions={{createModal, updateModal, deleteModal}}/>
            </div>
          </div>
        </div>}
      </section>
    );
  }
}
