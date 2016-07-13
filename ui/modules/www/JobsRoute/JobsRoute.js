// import

import React, {Component, PropTypes} from 'react';
import styles from './JobsRoute.css';
import formStyles from '../Styles/Form.css';
import cn from 'classnames';
import {connect} from 'react-redux';
import SiteMain from '../SiteMain/SiteMain.js';
import JobsList from '../JobsList/JobsList.js';
import {queryJobs} from '../JobsStore/JobsStore.js';
import {enableSiteLoader, disableSiteLoader} from '../SiteLoaderStore/SiteLoaderStore.js';
import FilterBar from '../FilterBar/FilterBar.js';
import JobsFilter from '../JobsFilter/JobsFilter.js';
import {createModal} from '../SiteModalStore/SiteModalStore.js';
import RerunJobsModal from '../RerunJobsModal/RerunJobsModal.js';

// export

@connect((state) => {
  return {
    jobs: state.jobs.query,
  };
})
export default class JobsRoute extends Component {
  static propTypes = {
    className: PropTypes.string,
    jobs: PropTypes.array,
  };

  state = {
    jobs: null,
  };

  componentDidMount() {
    queryJobs();

    if (!this.props.jobs) {
      enableSiteLoader('route');
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.jobs && !prevProps.jobs) {
      disableSiteLoader('route');
    }
  }

  className() {
    return cn(styles.JobsRoute, this.props.className);
  }

  filterJobs(jobs) {
    this.setState({jobs});
  }

  rerun() {
    createModal({
      title: 'Re-Run All Jobs',
      component: RerunJobsModal,
      props: {
        jobs: this.state.jobs || this.props.jobs,
      },
    });
  }

  render() {
    const {jobs, ...props} = this.props;

    return (
      <SiteMain {...props} title="Jobs List" className={this.className()}>
        <FilterBar>
          <JobsFilter className={styles.filter} jobs={jobs} onFilter={::this.filterJobs}/>
          <button className={cn(styles.button, formStyles.hollowButton)} onClick={::this.rerun}>
            <span>Re-run</span>
          </button>
        </FilterBar>

        <JobsList className={styles.list} jobs={this.state.jobs}/>
      </SiteMain>
    );
  }
}
