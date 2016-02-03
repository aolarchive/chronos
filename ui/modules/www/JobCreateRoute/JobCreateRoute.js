// import

import React, {Component, PropTypes} from 'react';
import DocumentTitle from 'react-document-title';
import {createJob} from '../JobStore/JobStore.js';
import JobForm from '../JobForm/JobForm.js';
import {connect} from 'react-redux';
import {routeJobUpdate} from '../RouterStore/RouterStore.js';
import _ from 'lodash';

// export

@connect((state) => {
  const form = state.form.job;
  const name = form && form.create && form.create.name && form.create.name.value;

  return {
    job: _.find(_.values(state.jobs.jobs), {name}),
  };
})
export default class JobCreateRoute extends Component {
  static propTypes = {
    job: PropTypes.object,
  };

  state = {
    submit: false,
  };

  componentDidUpdate() {
    if (this.props.job && this.state.submit) {
      routeJobUpdate(this.props.job);
    }
  }

  handleSubmit(data) {
    createJob(null, null, data);
    this.setState({submit: true});
  }

  render() {
    return (
      <DocumentTitle title={'Create Job // Chronos'}>
        <main id="route-job" className="site-main route-job">
          <JobForm formKey="create" onSubmit={::this.handleSubmit}/>
        </main>
      </DocumentTitle>
    );
  }
}
