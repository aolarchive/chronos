// import

import React, {Component, PropTypes} from 'react';
import {reduxForm} from 'redux-form';
import {deleteModal} from '../ModalStore/ModalStore';

// export

@reduxForm({
  form: 'deleteJob',
  fields: ['job'],
  validate: function validateDeleteJobForm() {
    return {};
  },
})
export default class DeleteJobForm extends Component {
  static propTypes = {
    fields: PropTypes.object.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    initializeForm: PropTypes.func.isRequired,
    job: PropTypes.object.isRequired,
    resetForm: PropTypes.func.isRequired,
  };

  componentDidMount() {
    this.updateForm();
  }

  componentWillUpdate(nextProps) {
    if (this.props.job !== nextProps.job) {
      this.updateForm();
    }
  }

  componentWillUnmount() {
    this.props.resetForm();
  }

  updateForm() {
    this.props.initializeForm({
      job: this.props.job,
    });
  }

  render() {
    const {handleSubmit} = this.props;

    return (
      <form id="form-deletejob" className="form-deletejob" onSubmit={handleSubmit}>
        <p>Are you sure you want to delete job <strong>{this.props.job.name}</strong>?</p>

        <div className="deletejob-button-group">
          <button className="job-button deletejob-input-button" type="button" onClick={deleteModal}>Cancel</button>
          <button className="job-button deletejob-input-button primary" onClick={handleSubmit}>Delete</button>
        </div>
      </form>
    );
  }
}
