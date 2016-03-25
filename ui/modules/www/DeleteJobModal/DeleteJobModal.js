// import

import React, {Component, PropTypes} from 'react';
import DeleteJobForm from '../DeleteJobForm/DeleteJobForm.js';
import {deleteJob} from '../JobsStore/JobsStore.js';
import {deleteModal} from '../SiteModalStore/SiteModalStore.js';
import {routeJobs} from '../RouterStore/RouterStore.js';

// export

export default class DeleteJobModal extends Component {
  static propTypes = {
    job: PropTypes.object.isRequired,
  };

  handleSubmit(data) {
    deleteJob(data.job.id).then(routeJobs);
    deleteModal();
  }

  render() {
    return (
      <DeleteJobForm formKey="modal" onSubmit={::this.handleSubmit} job={this.props.job}/>
    );
  }
}
