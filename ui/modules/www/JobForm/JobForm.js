// import

import React, {Component, PropTypes} from 'react';
import FilterBar from '../FilterBar/FilterBar';
import {reduxForm} from 'redux-form';
import Codemirror from 'react-codemirror';
import {sqlOpts, shellOpts} from '../CodeHelper/CodeHelper';
import {updateLoader} from '../LoaderStore/LoaderStore';
import {querySources} from '../SourceStore/SourceStore';
import {connect} from 'react-redux';
import RerunJobsModal from '../RerunJobsModal/RerunJobsModal';
import DeleteJobModal from '../DeleteJobModal/DeleteJobModal';
import {createModal} from '../ModalStore/ModalStore';
import _ from 'lodash';
import {routeJobs} from '../RouterStore/RouterStore';
import {createMessage} from '../MessageStore/MessageStore';

// vars

const requiredFields = ['interval', 'driver', 'startMinute'];

// export

@reduxForm({
  form: 'job',
  fields: ['enabled', 'name', 'type', 'description', 'driver', 'user', 'password', 'interval', 'startDay', 'startHour', 'startMinute', 'resultEmail', 'statusEmail', 'id', 'lastModified', 'code', 'resultQuery'],
  validate(vals, props) {
    const errors = {};

    _.forEach(vals, (val, key) => {
      if (_.includes(requiredFields, key) && _.isUndefined(val)) {
        errors[key] = 'This field is required.';
      } else if (key === 'startHour' && vals.interval !== 'Hourly' && _.isUndefined(val)) {
        errors[key] = 'This field is required.';
      } else if (key === 'startDay' && vals.interval === 'Weekly' && _.isUndefined(val)) {
        errors[key] = 'This field is required.';
      }
    });

    if (vals.type === 'Script') {
      delete errors.driver;
    }

    if (!_.isEmpty(errors) && props.form._submitFailed) {
      props.stopSubmit(false);
      createMessage({
        title: 'Save Job',
        message: 'Please fill in required fields.',
        level: 'error',
      });
    }

    return errors;
  },
})
@connect((state) => {
  return {
    loader: state.loader.global || {},
    sources: state.sources.query,
    deletedJobs: state.jobs.deleted,
  };
})
export default class JobForm extends Component {
  static propTypes = {
    deletedJobs: PropTypes.array.isRequired,
    fields: PropTypes.object.isRequired,
    form: PropTypes.object,
    formKey: PropTypes.string.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    initializeForm: PropTypes.func.isRequired,
    job: PropTypes.object,
    loader: PropTypes.object.isRequired,
    resetForm: PropTypes.func.isRequired,
    sources: PropTypes.array,
    stopSubmit: PropTypes.func,
  };

  state = {
    thisQuery: 'code',
  };

  componentDidMount() {
    querySources();
    updateLoader('global', {active: true});
    this.props.initializeForm({
      startDay: 1,
      code: '',
      resultQuery: '',
      resultEmail: '',
      statusEmail: '',
    });
  }

  componentWillUpdate(nextProps) {
    if (nextProps.fields.type.value === 'Script' && this.state.thisQuery !== 'code') {
      this.setState({thisQuery: 'code'});
    }

    if (!this.props.fields.type.value) {
      this.props.fields.type.onChange('Query');
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.sources && this.props.loader.active) {
      updateLoader('global', {active: false});
    }

    if (prevProps.job !== this.props.job) {
      this.props.initializeForm(this.props.job);
    }

    if (prevProps.job && this.props.deletedJobs.length && prevProps.job.id === _.last(this.props.deletedJobs).id) {
      routeJobs();
    }
  }

  componentWillUnmount() {
    this.props.resetForm();
  }

  rerun() {
    createModal({
      title: 'Re-Run Job',
      component: RerunJobsModal,
      props: {
        jobs: [this.props.job],
      },
    });
  }

  deleteJob() {
    createModal({
      title: 'Delete Job',
      component: DeleteJobModal,
      props: {
        job: this.props.job,
      },
    });
  }

  getSourcesDOM(sources) {
    if (!sources) {
      return null;
    }

    return sources.map((source, i) => {
      return <option key={i} value={source.name}>{source.name}</option>;
    });
  }

  getIntervalDOM() {
    return ['Hourly', 'Daily', 'Weekly', 'Monthly'].map((interval, i) => {
      return <option key={i} value={interval}>{interval}</option>;
    });
  }

  getWeekDOM() {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, i) => {
      return <option key={i} value={i + 1}>{day}</option>;
    });
  }

  getTimeDOM(len, pad) {
    return Array.from(new Array(len), (x, i) => {return i;}).map((i) => {
      return <option key={i} value={i}>{(pad && i < 10) ? '0' + i : i}</option>;
    });
  }

  selectStyle(val) {
    return {
      color: _.isUndefined(val) && 'rgb(201, 201, 201)',
    };
  }

  fieldClass(field, cls) {
    if (_.isString(cls)) {
      cls = cls.split(' ');
    }

    if (field.error) {
      cls.push('field-error');
    }

    return cls.join(' ');
  }

  toggleCode(query) {
    return () => {
      this.setState({thisQuery: query});
    };
  }

  render() {
    const {fields: {enabled, type, name, description, driver, user, password, interval, startDay, startHour, startMinute, resultEmail, statusEmail, id, lastModified, code, resultQuery}, handleSubmit} = this.props;

    const thisQuery = this.state.thisQuery === 'code' ? code : resultQuery;

    return (
      <form id="form-job" className="form-job" onSubmit={handleSubmit}>
        <FilterBar>
          <input {...name} placeholder="Name" type="text" className={this.fieldClass(name, 'job-input job-input-name')}/>

          <span className="job-input-spacer"/>

          <button className="job-button job-button-save primary" onClick={handleSubmit}>Save</button>
          {this.props.formKey !== 'create' &&
            <button type="button" className="job-button job-button-run" onClick={::this.rerun}>Re-run</button>}
          {this.props.formKey !== 'create' &&
            <button type="button" className="job-button job-button-delete" onClick={::this.deleteJob}>Delete</button>}
        </FilterBar>

        <section className="job-edit">
          <div className="job-edit-fields">
            <label>Description</label>
            <textarea {...description} className={this.fieldClass(description, 'job-input job-input-body')}/>

            <label className="option job-checkbox">
              <input {...enabled} type="checkbox" className={this.fieldClass(enabled, 'job-input job-input-enabled')}/>
              Enabled
            </label>

            <hr/>

            <label>Job Type</label>
            <div className="select-overlay"/>
            <select {...type} className={this.fieldClass(type, 'job-input job-input-type')} defaultValue="Query" style={this.selectStyle(type.value)}>
              <option value="Query">Query</option>
              <option value="Script">Script</option>
            </select>

            {type.value === 'Query' ? (
              <div className="job-input-region">
                <label>Data Source</label>
                <div className="select-overlay"/>
                <select {...driver} className={this.fieldClass(driver, 'job-input job-input-source')} defaultValue="" style={this.selectStyle(driver.value)}>
                  <option disabled value=""></option>
                  {this.getSourcesDOM(this.props.sources)}
                </select>

                <label>Database Username (optional)</label>
                <input {...user} type="text" className={this.fieldClass(user, 'job-input job-input-user')}/>

                <label>Database Password (optional)</label>
                <input {...password} type="password" className={this.fieldClass(password, 'job-input job-input-pass')}/>
              </div>
            ) : null}

            <hr/>

            <label>Interval</label>
            <div className="select-overlay"/>
            <select {...interval} className={this.fieldClass(interval, 'job-input job-input-interval')} defaultValue="" style={this.selectStyle(interval.value)}>
              <option disabled value=""></option>
              {this.getIntervalDOM()}
            </select>

            {interval.value === 'Weekly' ? (
              <div className="job-input-region">
                <label>Day of Week</label>
                <div className="select-overlay"/>
                <select {...startDay} className={this.fieldClass(startDay, 'job-input job-input-dayofweek')} defaultValue="" style={this.selectStyle(startDay.value)}>
                  <option disabled value=""></option>
                  {this.getWeekDOM()}
                </select>
              </div>
            ) : null}

            {interval.value !== 'Hourly' ? (
              <div className="job-input-half">
                <label>Hour</label>
                <div className="select-overlay"/>
                <select {...startHour} className={this.fieldClass(startHour, 'job-input job-input-hour')} defaultValue="" style={this.selectStyle(startHour.value)}>
                  <option disabled value=""></option>
                  {this.getTimeDOM(24)}
                </select>
              </div>
            ) : null}

            <div className={interval.value === 'Hourly' ? 'job-input-region' : 'job-input-half'}>
              <label>Minute</label>
              <div className="select-overlay"/>
              <select {...startMinute} className={this.fieldClass(startMinute, 'job-input job-input-minute')} defaultValue="" style={this.selectStyle(startMinute.value)}>
                <option disabled value=""></option>
                {this.getTimeDOM(60, true)}
              </select>
            </div>

            <hr/>

            {type.value === 'Query' ? (
              <div className="job-input-region">
                <label>Result Email (one per line)</label>
                <textarea {...resultEmail} className={this.fieldClass(resultEmail, 'job-input job-input-email')}/>
              </div>
            ) : null}

            <label>Status Email (one per line)</label>
            <textarea {...statusEmail} className={this.fieldClass(statusEmail, 'job-input job-input-email')}/>

            {this.props.formKey !== 'create' &&
              <input {...id} type="hidden" className={this.fieldClass(id, 'job-input job-input-id')}/>}
            {this.props.formKey !== 'create' &&
              <input {...lastModified} type="hidden" className={this.fieldClass(lastModified, 'job-input job-input-lastModified')}/>}
          </div>

          <div className="job-edit-code">
            <div className="job-edit-code-toggles">
              <div className={'job-edit-code-toggle' + (thisQuery === code ? ' active' : '')} onClick={this.toggleCode('code')}>{type.value === 'Query' ? 'Query' : 'Script'}</div>
              {type.value === 'Query' ? (
                <div className={'job-edit-code-toggle' + (thisQuery === resultQuery ? ' active' : '')} onClick={this.toggleCode('resultQuery')}>Result</div>
              ) : null}
            </div>

            <Codemirror key={thisQuery === code ? 'code' : 'resultQuery'} {...thisQuery} value={thisQuery.value || ''} options={type.value === 'Query' ? sqlOpts : shellOpts}/>
          </div>
        </section>
      </form>
    );
  }
}
