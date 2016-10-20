// import

import React, {Component, PropTypes} from 'react';
import {reduxForm} from 'redux-form';
import moment from 'moment';
import formStyles from '../Styles/Form.css';
import cn from 'classnames';
import _ from 'lodash';
import {connect} from 'react-redux';

// vars

const jobIntervals = [
  'Hourly',
  'Daily',
  'Monthly',
  'Yearly',
  'Weekly',
];

// export

@reduxForm({
  form: 'rerun',
  fields: ['start', 'end', 'jobs', 'intervals'],
  initialValues: {
    intervals: [],
  },
  validate() {
    return {};
  },
})
@connect((state) => {
  return {
    useLocalTime: state.localStorage.useLocalTime === 'true',
  };
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
    useLocalTime: PropTypes.bool.isRequired,
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
    const {start, end, jobs, initializeForm, useLocalTime} = this.props;

    initializeForm({
      jobs,
      start: moment(start)[useLocalTime ? 'local' : 'utc']().minute(0).second(0).format(),
      end: moment(end)[useLocalTime ? 'local' : 'utc']().minute(59).second(0).format(),
    });
  }

  intervalSelect(interval) {
    const intervals = this.props.fields.intervals;

    return (event) => {
      if (event.target.checked) {
        intervals.onChange((intervals.value || []).concat(interval));
      } else {
        intervals.onChange(intervals.value.splice(intervals.value.indexOf(interval), 1));
      }
    };
  }

  render() {
    const {fields: {start, end}, handleSubmit, jobs} = this.props;

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

        {jobs.length > 1 ? (
          <div className={formStyles.group}>
            <label className={formStyles.label}>Job Intervals</label>
            {jobIntervals.map((interval, i) => {
              return (
                <label key={i} className={formStyles.checkboxLabel}>
                  <input type="checkbox" value={i}
                    onChange={::this.intervalSelect(i)}/>
                  <span>{_.capitalize(interval)}</span>
                </label>
              );
            })}
          </div>
        ) : null}

        <button className={cn(formStyles.button, formStyles.buttonPrimary, formStyles.modalButton)} onClick={handleSubmit}>Re-run</button>
      </form>
    );
  }
}
