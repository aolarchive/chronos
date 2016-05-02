// import

import React, {Component, PropTypes} from 'react';
import {reduxForm} from 'redux-form';
import moment from 'moment';
import formStyles from '../Styles/Form.css';
import cn from 'classnames';

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
      <form onSubmit={handleSubmit}>
        <div className={formStyles.affixGroup}>
          <label className={formStyles.affix}>Start</label>
          <input {...start} type="text" className={cn(formStyles.input, formStyles.affixed)}/>
        </div>

        <div className={formStyles.affixGroup}>
          <label className={formStyles.affix}>End</label>
          <input {...end} type="text" className={cn(formStyles.input, formStyles.affixed)}/>
        </div>

        <button className={cn(formStyles.button, formStyles.buttonPrimary, formStyles.modalButton)} onClick={handleSubmit}>Re-run</button>
      </form>
    );
  }
}
