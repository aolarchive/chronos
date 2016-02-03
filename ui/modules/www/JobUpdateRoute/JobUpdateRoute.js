// import

import React, {Component, PropTypes} from 'react';
import DocumentTitle from 'react-document-title';
import {updateLoader} from '../LoaderStore/LoaderStore';
import {getJob, updateJob} from '../JobStore/JobStore.js';
import JobForm from '../JobForm/JobForm';
import {connect} from 'react-redux';

// export

@connect((state, props) => {
  return {
    job: state.jobs.jobs[props.routeParams.id],
  };
})
export default class JobUpdateRoute extends Component {
  static propTypes = {
    job: PropTypes.object,
    routeParams: PropTypes.object.isRequired,
  };

  componentDidMount() {
    getJob(this.props.routeParams.id);
    updateLoader('global', {active: true});
  }

  componentDidUpdate(prevProps) {
    if (this.props.job !== prevProps.job) {
      updateLoader('global', {active: false});
    }
  }

  handleSubmit(data) {
    updateJob(data.id, null, data);
  }

  render() {
    return (
      <DocumentTitle title={(this.props.job ? 'Job: ' + this.props.job.name : 'Loading...') + ' || Chronos'}>
        <main id="route-job" className="site-main route-job">
          <JobForm formKey={this.props.routeParams.id} onSubmit={this.handleSubmit.bind(this)} job={this.props.job}/>
        </main>
      </DocumentTitle>
    );
  }
}
