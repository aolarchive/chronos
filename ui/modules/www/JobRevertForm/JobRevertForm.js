// import

import React, {Component, PropTypes} from 'react';
import FilterBar from '../FilterBar/FilterBar';
import {reduxForm} from 'redux-form';
import Codemirror from 'react-codemirror';
import {sqlOpts, shellOpts} from '../CodeHelper/CodeHelper.js';
import {enableSiteLoader, disableSiteLoader} from '../SiteLoaderStore/SiteLoaderStore.js';
import {querySources} from '../SourceStore/SourceStore.js';
import {connect} from 'react-redux';
import DeleteJobModal from '../DeleteJobModal/DeleteJobModal.js';
import {createModal} from '../SiteModalStore/SiteModalStore.js';
import _ from 'lodash';
import {routeJobs, routeJobUpdate} from '../RouterStore/RouterStore.js';
import styles from './JobRevertForm.css';
import formStyles from '../Styles/Form.css';
import sharedStyles from '../Styles/Shared.css';
import cn from 'classnames';
import {getJobNiceInterval, findRoot} from '../JobsHelper/JobsHelper.js';
import {queryJobs} from '../JobsStore/JobsStore.js';

// export

@reduxForm({
  form: 'jobrevert',
  fields: ['version'],
})
@connect((state) => {
  return {
    jobs: state.jobs.query,
    jobsByID: state.jobs.byID,
    loader: state.siteLoader,
    sources: state.sources.query,
    deletedJobs: state.jobs.deleted,
    hideSidebar: state.localStorage.hideSidebar === 'true',
    useLocalTime: state.localStorage.useLocalTime === 'true',
  };
})
export default class JobRevertForm extends Component {
  static propTypes = {
    deletedJobs: PropTypes.array.isRequired,
    errors: PropTypes.object.isRequired,
    fields: PropTypes.object.isRequired,
    form: PropTypes.object,
    formKey: PropTypes.string.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    hideSidebar: PropTypes.bool.isRequired,
    initializeForm: PropTypes.func.isRequired,
    job: PropTypes.object,
    jobs: PropTypes.array.isRequired,
    jobsByID: PropTypes.object.isRequired,
    loader: PropTypes.object.isRequired,
    resetForm: PropTypes.func.isRequired,
    sources: PropTypes.array,
    submitFailed: PropTypes.bool.isRequired,
    useLocalTime: PropTypes.bool.isRequired,
    versions: PropTypes.array,
  };

  state = {
    thisQuery: 'code',
    dependsOn: false,
  };

  componentDidMount() {
    querySources();
    queryJobs();
    enableSiteLoader('JobRevertForm');

    this.props.initializeForm({
      version: _.last(this.props.versions),
    });
  }

  componentWillUpdate(nextProps) {
    if (nextProps.fields.version.type === 'Script' && this.state.thisQuery !== 'code') {
      this.setState({thisQuery: 'code'});
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.sources && this.props.jobs && this.props.loader.active && this.props.loader.reasons.indexOf('JobRevertForm') > -1) {
      disableSiteLoader('JobRevertForm');
    }

    if (prevProps.job !== this.props.job) {
      this.props.initializeForm(this.props.job);
    }

    if (prevProps.job && this.props.deletedJobs.length && prevProps.job.id === _.last(this.props.deletedJobs).id) {
      routeJobs();
    }

    if (this.props.versions !== prevProps.versions) {
      this.props.initializeForm({
        version: _.last(this.props.versions),
      });
    }
  }

  componentWillUnmount() {
    this.props.resetForm();
  }

  edit() {
    routeJobUpdate(this.props.job);
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

  getJobParent() {
    const {job, jobsByID} = this.props;

    if (!job || !jobsByID) {
      return null;
    }

    return jobsByID[findRoot(job.id, jobsByID)];
  }

  selectStyle(val) {
    return {
      color: _.isUndefined(val) && 'rgb(201, 201, 201)',
    };
  }

  fieldClass(cls) {
    return cn(formStyles.input, styles.input, cls);
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

  toggleDependsOn(event) {
    this.setState({dependsOn: event.target.value});
  }

  render() {
    const {fields: {version}, handleSubmit, hideSidebar, useLocalTime} = this.props;
    const job = version.value;

    const thisQuery = this.state.thisQuery === 'code' ? job.code : job.resultQuery;
    const jobParent = this.getJobParent();

    return (
      <form className={styles.JobRevertForm} onSubmit={handleSubmit}>
        <FilterBar>
          <input type="text" className={this.fieldClass(styles.filterInput)} value={job.name} disabled/>

          <button className={cn(formStyles.button, formStyles.buttonPrimary, styles.button)} onClick={handleSubmit}>
            Revert
          </button>

          <button type="button" className={cn(formStyles.button, formStyles.hollowButton, styles.hollowButton)} onClick={::this.edit}>
            <span>Edit</span>
          </button>

          <button type="button" className={cn(formStyles.button, formStyles.hollowButton, styles.hollowButton)} onClick={::this.deleteJob}>
            <span>Delete</span>
          </button>
        </FilterBar>

        <section className={cn(styles.editRegion, {[styles.hideSidebar]: hideSidebar})}>
          <div className={styles.editFieldsRegion}>
            <label className={formStyles.label}>Description</label>
            <textarea className={this.fieldClass(styles.textarea)} value={job.description} disabled/>

            <label className={formStyles.checkboxLabel}>
              <input type="checkbox" className={this.fieldClass()} value={job.enabled} disabled/>
              Enabled
            </label>

            <label className={formStyles.checkboxLabel}>
              <input type="checkbox" className={this.fieldClass()} value={job.shouldRerun} disabled/>
              Rerun on error
            </label>

            <hr/>

            <label className={formStyles.label}>Job Type</label>
            <input type="text" className={this.fieldClass()} value={job.type} disabled/>

            {job.type === 'Query' ? (
              <div className={styles.fullWidth}>
                <label className={formStyles.label}>Data Source</label>
                <input className={this.fieldClass()} value={job.driver} disabled/>

                <label className={formStyles.label}>Database Username</label>
                <input type="text" className={this.fieldClass()} value={job.user} disabled/>

                <label className={formStyles.label}>Database Password</label>
                <input type="password" className={this.fieldClass()} value={job.password} disabled/>
              </div>
            ) : null}

            <hr/>

            {this.state.dependsOn ? (
              <div>
                <label className={formStyles.label}>Depends On</label>
                <input className={this.fieldClass()} value={jobParent ? jobParent.name : ''} disabled/>

                {jobParent ? (
                  <div className={styles.fullWidth}>
                    <span className={styles.localTime}>{`This job will run soon after ${getJobNiceInterval(jobParent.cronString, useLocalTime).toLowerCase()} locally.`}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {!this.state.dependsOn ? (
              <div>
                <label className={formStyles.label}><a className={styles.link} href="https://en.wikipedia.org/wiki/Cron#Format" target="_blank">CRON String</a></label>
                <input type="text" className={this.fieldClass()} value={job.cronString} disabled/>

                <div className={styles.fullWidth}>
                  <span className={styles.localTime}>{`This job will run ${getJobNiceInterval(job.cronString, useLocalTime).toLowerCase()} locally.`}</span>
                </div>
              </div>
            ) : null}

            <hr/>

            {job.type === 'Query' ? (
              <div className={styles.fullWidth}>
                <label className={formStyles.label}>Result Email (one per line)</label>
                <textarea className={this.fieldClass(styles.textarea)} value={job.resultEmail} disabled/>
              </div>
            ) : null}

            <label className={formStyles.label}>Status Email (one per line)</label>
            <textarea className={this.fieldClass(styles.textarea)} value={job.statusEmail} disabled/>
          </div>

          <div className={styles.editCodeRegion}>
            <div className={cn(sharedStyles.tabs, styles.tabs)}>
              <div className={this.tabClass(thisQuery === job.code)} onClick={this.toggleCode('code')}>
                {job.type === 'Query' ? 'Query' : 'Script'}
              </div>
              {job.type === 'Query' ? (
                <div className={this.tabClass(thisQuery === job.resultQuery)} onClick={this.toggleCode('resultQuery')}>
                  Result
                </div>
              ) : null}
            </div>

            <Codemirror key={thisQuery === job.code ? 'code' : 'resultQuery'} {...thisQuery} value={thisQuery || ''} options={job.type === 'Query' ? sqlOpts : shellOpts}/>
          </div>
        </section>
      </form>
    );
  }
}
