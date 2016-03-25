// import

import React, {Component, PropTypes} from 'react';
import FilterBar from '../FilterBar/FilterBar';
import {reduxForm} from 'redux-form';
import Codemirror from 'react-codemirror';
import {sqlOpts, shellOpts} from '../CodeHelper/CodeHelper.js';
import {enableSiteLoader, disableSiteLoader} from '../SiteLoaderStore/SiteLoaderStore.js';
import {querySources} from '../SourceStore/SourceStore.js';
import {connect} from 'react-redux';
import RerunJobsModal from '../RerunJobsModal/RerunJobsModal.js';
import DeleteJobModal from '../DeleteJobModal/DeleteJobModal.js';
import {createModal} from '../SiteModalStore/SiteModalStore.js';
import _ from 'lodash';
import {routeJobs} from '../RouterStore/RouterStore.js';
import {createMessage} from '../MessageStore/MessageStore.js';
import styles from './JobForm.css';
import formStyles from '../Styles/Form.css';
import sharedStyles from '../Styles/Shared.css';
import cn from 'classnames';

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

    if (!_.isEmpty(errors) && props.submitFailed) {
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
    loader: state.siteLoader || {},
    sources: state.sources.query,
    deletedJobs: state.jobs.deleted,
    hideSidebar: state.localStorage.hideSidebar === 'true',
  };
})
export default class JobForm extends Component {
  static propTypes = {
    deletedJobs: PropTypes.array.isRequired,
    fields: PropTypes.object.isRequired,
    formKey: PropTypes.string.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    hideSidebar: PropTypes.bool.isRequired,
    initializeForm: PropTypes.func.isRequired,
    job: PropTypes.object,
    loader: PropTypes.object.isRequired,
    resetForm: PropTypes.func.isRequired,
    sources: PropTypes.array,
    stopSubmit: PropTypes.func,
    submitFailed: PropTypes.bool.isRequired,
  };

  state = {
    thisQuery: 'code',
  };

  componentDidMount() {
    querySources();
    enableSiteLoader('JobForm');
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
      disableSiteLoader('JobForm');
    }

    if (prevProps.job !== this.props.job) {
      console.log(this.props.job);
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
    return cn(formStyles.input, styles.input, cls, {
      [styles.error]: field.error,
    });
  }

  toggleCode(query) {
    return () => {
      this.setState({thisQuery: query});
    };
  }

  tabClass(active) {
    return cn(sharedStyles.tab, styles.tab, {
      [sharedStyles.activeTab]: active,
    });
  }

  render() {
    const {fields: {enabled, type, name, description, driver, user, password, interval, startDay, startHour, startMinute, resultEmail, statusEmail, id, lastModified, code, resultQuery}, handleSubmit, hideSidebar} = this.props;

    const thisQuery = this.state.thisQuery === 'code' ? code : resultQuery;

    return (
      <form className={styles.JobForm} onSubmit={handleSubmit}>
        <FilterBar>
          <input {...name} placeholder="Name" type="text" className={this.fieldClass(name, styles.filterInput)}/>

          <button className={cn(formStyles.button, formStyles.buttonPrimary, styles.button)} onClick={handleSubmit}>Save</button>
          {this.props.formKey !== 'create' &&
            <button type="button" className={cn(formStyles.button, formStyles.hollowButton)} onClick={::this.rerun}>Re-run</button>}
          {this.props.formKey !== 'create' &&
            <button type="button" className={cn(formStyles.button, formStyles.hollowButton)} onClick={::this.deleteJob}>Delete</button>}
        </FilterBar>

        <section className={cn(styles.editRegion, {[styles.hideSidebar]: hideSidebar})}>
          <div className={styles.editFieldsRegion}>
            <label className={formStyles.label}>Description</label>
            <textarea {...description} className={this.fieldClass(description, styles.textarea)}/>

            <label className={formStyles.checkboxLabel}>
              <input {...enabled} type="checkbox" className={this.fieldClass(enabled)}/>
              Enabled
            </label>

            <hr/>

            <label className={formStyles.label}>Job Type</label>
            <div className={formStyles.selectOverlay}/>
            <select {...type} className={this.fieldClass(type)} defaultValue="Query" style={this.selectStyle(type.value)}>
              <option value="Query">Query</option>
              <option value="Script">Script</option>
            </select>

            {type.value === 'Query' ? (
              <div className={styles.fullWidth}>
                <label className={formStyles.label}>Data Source</label>
                <div className={formStyles.selectOverlay}/>
                <select {...driver} className={this.fieldClass(driver)} defaultValue="" style={this.selectStyle(driver.value)}>
                  <option disabled value=""></option>
                  {this.getSourcesDOM(this.props.sources)}
                </select>

                <label className={formStyles.label}>Database Username (optional)</label>
                <input {...user} type="text" className={this.fieldClass(user)}/>

                <label className={formStyles.label}>Database Password (optional)</label>
                <input {...password} type="password" className={this.fieldClass(password)}/>
              </div>
            ) : null}

            <hr/>

            <label className={formStyles.label}>Interval</label>
            <div className={formStyles.selectOverlay}/>
            <select {...interval} className={this.fieldClass(interval)} defaultValue="" style={this.selectStyle(interval.value)}>
              <option disabled value=""></option>
              {this.getIntervalDOM()}
            </select>

            {interval.value === 'Weekly' ? (
              <div className={styles.fullWidth}>
                <label className={formStyles.label}>Day of Week</label>
                <div className={formStyles.selectOverlay}/>
                <select {...startDay} className={this.fieldClass(startDay)} defaultValue="" style={this.selectStyle(startDay.value)}>
                  <option disabled value=""></option>
                  {this.getWeekDOM()}
                </select>
              </div>
            ) : null}

            {interval.value !== 'Hourly' ? (
              <div className={styles.halfWidth}>
                <label className={formStyles.label}>Hour</label>
                <div className={formStyles.selectOverlay}/>
                <select {...startHour} className={this.fieldClass(startHour)} defaultValue="" style={this.selectStyle(startHour.value)}>
                  <option disabled value=""></option>
                  {this.getTimeDOM(24)}
                </select>
              </div>
            ) : null}

            <div className={interval.value === 'Hourly' ? styles.fullWidth : styles.halfWidth}>
              <label className={formStyles.label}>Minute</label>
              <div className={formStyles.selectOverlay}/>
              <select {...startMinute} className={this.fieldClass(startMinute)} defaultValue="" style={this.selectStyle(startMinute.value)}>
                <option disabled value=""></option>
                {this.getTimeDOM(60, true)}
              </select>
            </div>

            <hr/>

            {type.value === 'Query' ? (
              <div className={styles.fullWidth}>
                <label className={formStyles.label}>Result Email (one per line)</label>
                <textarea {...resultEmail} className={this.fieldClass(resultEmail, styles.textarea)}/>
              </div>
            ) : null}

            <label className={formStyles.label}>Status Email (one per line)</label>
            <textarea {...statusEmail} className={this.fieldClass(statusEmail, styles.textarea)}/>

            {this.props.formKey !== 'create' &&
              <input {...id} type="hidden" className={this.fieldClass(id)}/>}
            {this.props.formKey !== 'create' &&
              <input {...lastModified} type="hidden" className={this.fieldClass(lastModified)}/>}
          </div>

          <div className={styles.editCodeRegion}>
            <div className={cn(sharedStyles.tabs, styles.tabs)}>
              <div className={this.tabClass(thisQuery === code)} onClick={this.toggleCode('code')}>
                {type.value === 'Query' ? 'Query' : 'Script'}
              </div>
              {type.value === 'Query' ? (
                <div className={this.tabClass(thisQuery === resultQuery)} onClick={this.toggleCode('resultQuery')}>
                  Result
                </div>
              ) : null}
            </div>

            <Codemirror key={thisQuery === code ? 'code' : 'resultQuery'} {...thisQuery} value={thisQuery.value || ''} options={type.value === 'Query' ? sqlOpts : shellOpts}/>
          </div>
        </section>
      </form>
    );
  }
}
