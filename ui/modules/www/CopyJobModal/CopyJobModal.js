// import

import React, {Component, PropTypes} from 'react';
import CopyJobForm from '../CopyJobForm/CopyJobForm';
import {createJob} from '../JobsStore/JobsStore';
import {deleteModal} from '../SiteModalStore/SiteModalStore';
import {routeJobUpdate} from '../RouterStore/RouterStore.js';
import _ from 'lodash';

// export

export default class CopyJobModal extends Component {
  static propTypes = {
    job: PropTypes.object.isRequired,
  };

  handleSubmit({name}) {
    const job = _.cloneDeep(this.props.job);

    job.name = name;
    job.enabled = false;

    deleteModal();

    createJob(null, null, job).then((action) => {
      routeJobUpdate(action.res.body.id);
    });
  }

  render() {
    return (
      <CopyJobForm formKey="modal" onSubmit={::this.handleSubmit} job={this.props.job || {}}/>
    );
  }
}
