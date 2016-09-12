// import

import React, {Component, PropTypes} from 'react';
import FilterBar from '../FilterBar/FilterBar';
import Codemirror from 'react-codemirror';
import {diffOpts, sqlOpts, shellOpts} from '../CodeHelper/CodeHelper.js';
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
import {getJobNiceInterval, findRoot, getJobDiff} from '../JobsHelper/JobsHelper.js';
import {queryJobs} from '../JobsStore/JobsStore.js';
import CopyJobModal from '../CopyJobModal/CopyJobModal.js';

// export

@connect((state, props) => {
  const {job, versions} = props;

  return {
    jobs: state.jobs.query,
    jobsByID: state.jobs.byID,
    loader: state.siteLoader,
    sources: state.sources.query,
    deletedJobs: state.jobs.deleted,
    useLocalTime: state.localStorage.useLocalTime === 'true',
    version: state.jobs.versionSelected[job && job.id] || _.last(versions),
    diffView: state.jobs.diffView,
  };
})
export default class JobRevertForm extends Component {
  static propTypes = {
    deletedJobs: PropTypes.array.isRequired,
    diffView: PropTypes.string.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    job: PropTypes.object,
    jobs: PropTypes.array.isRequired,
    jobsByID: PropTypes.object.isRequired,
    loader: PropTypes.object.isRequired,
    sources: PropTypes.array,
    useLocalTime: PropTypes.bool.isRequired,
    version: PropTypes.object,
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
  }

  componentWillUpdate(nextProps) {
    if (nextProps.version.type === 'Script' && this.state.thisQuery !== 'code') {
      this.setState({thisQuery: 'code'});
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.sources && this.props.jobs && this.props.loader.active && this.props.loader.reasons.indexOf('JobRevertForm') > -1) {
      disableSiteLoader('JobRevertForm');
    }

    if (prevProps.job && this.props.deletedJobs.length && prevProps.job.id === _.last(this.props.deletedJobs).id) {
      routeJobs();
    }
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

  copyJob() {
    createModal({
      title: 'Copy Job Revision',
      component: CopyJobModal,
      props: {
        job: this.props.version,
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
    const {handleSubmit, useLocalTime, version, job, diffView, versions} = this.props;

    const thisQuery = this.state.thisQuery === 'code' ? version.code : version.resultQuery;
    const jobParent = this.getJobParent();

    const prev = diffView === 'current' ? job : versions[_.findIndex(versions, version) - 1];
    const diff = getJobDiff(prev, version, this.state.thisQuery === 'code' ? 'code' : 'resultQuery');

    const submit = (e) => {
      e.preventDefault();
      handleSubmit(version);
    };

    return (
      <form className={styles.JobRevertForm} onSubmit={submit}>
        <FilterBar>
          <input type="text" className={this.fieldClass(styles.filterInput)} value={version.name} disabled/>

          <button className={cn(formStyles.button, formStyles.buttonPrimary, styles.button)} onClick={submit}>
            Revert
          </button>

          <div className={styles.buttonGroup}>
            <button type="button" className={cn(formStyles.button, formStyles.hollowButton, styles.hollowButton)} onClick={::this.edit}>
              <span>Edit</span>
            </button>

            <button type="button" className={cn(formStyles.button, formStyles.hollowButton, styles.hollowButton)} onClick={::this.copyJob}>
              <span>Copy</span>
            </button>

            <button type="button" className={cn(formStyles.button, formStyles.hollowButton, styles.hollowButton)} onClick={::this.deleteJob}>
              <span>Delete</span>
            </button>
          </div>
        </FilterBar>

        <section className={cn(styles.editRegion)}>
          <div className={styles.editFieldsRegion}>
            <label className={formStyles.label}>Description</label>
            <textarea className={this.fieldClass(styles.textarea)} value={version.description} disabled/>

            <label className={formStyles.checkboxLabel}>
              <input type="checkbox" className={this.fieldClass()} value={version.enabled} disabled/>
              Enabled
            </label>

            <label className={formStyles.checkboxLabel}>
              <input type="checkbox" className={this.fieldClass()} value={version.shouldRerun} disabled/>
              Rerun on error
            </label>

            <hr/>

            <label className={formStyles.label}>Job Type</label>
            <input type="text" className={this.fieldClass()} value={version.type} disabled/>

            {version.type === 'Query' ? (
              <div className={styles.fullWidth}>
                <label className={formStyles.label}>Data Source</label>
                <input className={this.fieldClass()} value={version.driver} disabled/>

                <label className={formStyles.label}>Database Username</label>
                <input type="text" className={this.fieldClass()} value={version.user} disabled/>

                <label className={formStyles.label}>Database Password</label>
                <input type="password" className={this.fieldClass()} value={version.password} disabled/>
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
                <input type="text" className={this.fieldClass()} value={version.cronString} disabled/>

                {version.cronString && (
                  <div className={styles.fullWidth}>
                    <span className={styles.localTime}>{`This job will run ${getJobNiceInterval(version.cronString, useLocalTime).toLowerCase()} locally.`}</span>
                  </div>
                )}
              </div>
            ) : null}

            <hr/>

            {version.type === 'Query' ? (
              <div className={styles.fullWidth}>
                <label className={formStyles.label}>Result Email (one per line)</label>
                <textarea className={this.fieldClass(styles.textarea)} value={version.resultEmail} disabled/>
              </div>
            ) : null}

            <label className={formStyles.label}>Status Email (one per line)</label>
            <textarea className={this.fieldClass(styles.textarea)} value={version.statusEmail} disabled/>
          </div>

          <div className={styles.editCodeRegion}>
            <div className={cn(sharedStyles.tabs, styles.tabs)}>
              <div className={this.tabClass(thisQuery === version.code)} onClick={this.toggleCode('code')}>
                {version.type === 'Query' ? 'Query' : 'Script'}
              </div>
              {version.type === 'Query' ? (
                <div className={this.tabClass(thisQuery === version.resultQuery)} onClick={this.toggleCode('resultQuery')}>
                  Result
                </div>
              ) : null}
            </div>

            {diffView === 'none' ? (
              <Codemirror key={thisQuery === version.code ? 'code' : 'resultQuery'} value={thisQuery || ''} options={_.assign({readOnly: true}, version.type === 'Query' ? sqlOpts : shellOpts)}/>
              ) : (
              <Codemirror key={thisQuery === version.code ? 'code' : 'resultQuery'} value={diff || ''} options={_.assign({readOnly: true}, diffOpts)}/>
            )}
          </div>
        </section>
      </form>
    );
  }
}
