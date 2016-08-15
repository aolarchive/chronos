// import

import React, {Component, PropTypes} from 'react';
import {enableSiteLoader, disableSiteLoader} from '../SiteLoaderStore/SiteLoaderStore';
import {getJob, updateJob, getJobVersions} from '../JobsStore/JobsStore.js';
import JobRevertForm from '../JobRevertForm/JobRevertForm';
import {connect} from 'react-redux';
import styles from './JobRevertRoute.css';
import SiteMain from '../SiteMain/SiteMain.js';
import cn from 'classnames';
import VersionsList from '../VersionsList/VersionsList.js';
import {routeJobUpdate} from '../RouterStore/RouterStore.js';

// export

@connect((state, props) => {
  return {
    job: state.jobs.jobs[props.routeParams.id],
    versions: state.jobs.versions[props.routeParams.id],
  };
})
export default class JobRevertRoute extends Component {
  static propTypes = {
    className: PropTypes.string,
    job: PropTypes.object,
    routeParams: PropTypes.object.isRequired,
    versions: PropTypes.array,
  };

  componentDidMount() {
    getJob(this.props.routeParams.id);
    getJobVersions(this.props.routeParams.id);
    enableSiteLoader('revert-job');
    enableSiteLoader('revert-versions');
  }

  componentDidUpdate(prevProps) {
    if (this.props.job !== prevProps.job) {
      disableSiteLoader('revert-job');
    }

    if (this.props.versions !== prevProps.versions) {
      disableSiteLoader('revert-versions');
    }
  }

  className() {
    return cn(styles.JobRevertRoute, this.props.className);
  }

  handleSubmit(data) {
    updateJob(this.props.routeParams.id, null, data).then(() => {
      routeJobUpdate(this.props.routeParams.id);
    });
  }

  render() {
    const {versions, job, ...props} = this.props;
    const title = job ? 'Job: ' + job.name : 'Loading...';

    return (
      <SiteMain {...props} title={title} className={this.className()} sidebar={VersionsList}>
        {job && versions && <JobRevertForm formKey={this.props.routeParams.id} job={job} handleSubmit={::this.handleSubmit} versions={versions}/>}
      </SiteMain>
    );
  }
}
