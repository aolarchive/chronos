// import

import React, {Component, PropTypes} from 'react';
import {createJob} from '../JobsStore/JobsStore.js';
import JobForm from '../JobForm/JobForm.js';
import {connect} from 'react-redux';
import {routeJobUpdate} from '../RouterStore/RouterStore.js';
import _ from 'lodash';
import styles from './JobCreateRoute.css';
import SiteMain from '../SiteMain/SiteMain.js';
import cn from 'classnames';

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
    className: PropTypes.string,
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

  className() {
    return cn(styles.JobCreateRoute, this.props.className);
  }

  handleSubmit(data) {
    createJob(null, null, data);
    this.setState({submit: true});
  }

  render() {
    const {...props} = this.props;

    return (
      <SiteMain {...props} title="Create Job" className={this.className()}>
        <JobForm formKey="create" onSubmit={::this.handleSubmit}/>
      </SiteMain>
    );
  }
}
