// import

import React, {Component, PropTypes} from 'react';
import RerunJobsForm from '../RerunJobsForm/RerunJobsForm';
import {rerunJobs} from '../RunStore/RunStore';
import {deleteModal} from '../SiteModalStore/SiteModalStore';

// export

export default class RerunJobsModal extends Component {
  static propTypes = {
    jobs: PropTypes.array.isRequired,
  };

  handleSubmit(data) {
    rerunJobs(data.jobs, data.start, data.end, data.intervals);
    deleteModal();
  }

  render() {
    return (
      <RerunJobsForm formKey="modal" onSubmit={::this.handleSubmit} jobs={this.props.jobs || []}/>
    );
  }
}
