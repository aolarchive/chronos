// import

import React, {Component, PropTypes} from 'react';
import {reduxForm} from 'redux-form';
import moment from 'moment';

// export

@reduxForm({
  form: 'rerun',
  fields: ['start', 'end', 'jobs'],
  validate: function validateRerunJobsForm() {
    return {};
  },
})
export default class RerunJobsForm extends Component {
  static propTypes = {
    end: PropTypes.string,
    fields: PropTypes.object.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    initializeForm: PropTypes.func.isRequired,
    jobs: PropTypes.array.isRequired,
    resetForm: PropTypes.func.isRequired,
    start: PropTypes.string,
  };

  componentDidMount() {
    this.updateForm();
  }

  componentWillUpdate(nextProps) {
    if (this.props.jobs !== nextProps.jobs) {
      this.updateForm();
    }
  }

  componentWillUnmount() {
    this.props.resetForm();
  }

  updateForm() {
    this.props.initializeForm({
      jobs: this.props.jobs,
      start: moment(this.props.start).utcOffset(0).minute(0).second(0).format('YYYY-MM-DDTHH:mm:ss[Z]'),
      end: moment(this.props.end).utcOffset(0).minute(59).second(0).format('YYYY-MM-DDTHH:mm:ss[Z]'),
    });
  }

  render() {
    const {fields: {start, end}, handleSubmit} = this.props;

    return (
      <form id="form-job" className="form-job" onSubmit={handleSubmit}>
        <div className="input-affix-group">
          <label className="input-prefix">Start</label>
          <input {...start} type="text" className="rerun-input-start"/>
        </div>

        <div className="input-affix-group">
          <label className="input-prefix">End</label>
          <input {...end} type="text" className="rerun-input-end"/>
        </div>

        <button className="rerun-input-button primary" onClick={handleSubmit}>Re-run</button>
      </form>
    );
  }
}
