// import

import React, {Component, PropTypes} from 'react';
import {enableSiteLoader, disableSiteLoader} from '../SiteLoaderStore/SiteLoaderStore';
import {getJob, updateJob} from '../JobsStore/JobsStore.js';
import JobForm from '../JobForm/JobForm';
import {connect} from 'react-redux';
import styles from './JobUpdateRoute.css';
import SiteMain from '../SiteMain/SiteMain.js';
import cn from 'classnames';

// export

@connect((state, props) => {
  console.log(state.jobs.jobs);
  return {
    job: state.jobs.jobs[props.routeParams.id],
  };
})
export default class JobUpdateRoute extends Component {
  static propTypes = {
    className: PropTypes.string,
    job: PropTypes.object,
    routeParams: PropTypes.object.isRequired,
  };

  componentDidMount() {
    getJob(this.props.routeParams.id);
    enableSiteLoader('route');
  }

  componentDidUpdate(prevProps) {
    console.log(prevProps.job, this.props.job);
    if (this.props.job !== prevProps.job) {
      disableSiteLoader('route');
    }
  }

  className() {
    return cn(styles.JobUpdateRoute, this.props.className);
  }

  handleSubmit(data) {
    updateJob(data.id, null, data);
  }

  render() {
    const {className, job, ...props} = this.props;
    const title = this.props.job ? 'Job: ' + this.props.job.name : 'Loading...';

    return (
      <SiteMain {...props} title={title} className={this.className()}>
          <JobForm formKey={this.props.routeParams.id} onSubmit={this.handleSubmit.bind(this)} job={this.props.job}/>
      </SiteMain>
    );
  }
}
