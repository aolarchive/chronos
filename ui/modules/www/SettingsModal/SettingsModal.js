// import

import React, {Component, PropTypes} from 'react';
import SettingsForm from '../SettingsForm/SettingsForm';
import {setItem} from '../LocalStorageStore/LocalStorageStore.js';
import {deleteModal} from '../SiteModalStore/SiteModalStore';
import _ from 'lodash';

// export

export default class SettingsModal extends Component {
  static propTypes = {
    settings: PropTypes.object.isRequired,
  };

  handleSubmit(data) {
    _.forEach(data, (val, key) => {
      setItem(key, val);
    });

    deleteModal();
  }

  render() {
    const {settings} = this.props;

    return (
      <SettingsForm formKey="modal" onSubmit={::this.handleSubmit} settings={settings}/>
    );
  }
}
