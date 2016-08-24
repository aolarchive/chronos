// import

import React, {Component, PropTypes} from 'react';
import styles from './JobsRoute.css';
import formStyles from '../Styles/Form.css';
import cn from 'classnames';
import {connect} from 'react-redux';
import SiteMain from '../SiteMain/SiteMain.js';
import JobsList from '../JobsList/JobsList.js';
import {queryJobs} from '../JobsStore/JobsStore.js';
import {queryLongHistory} from '../RunStore/RunStore.js';
import {enableSiteLoader, disableSiteLoader} from '../SiteLoaderStore/SiteLoaderStore.js';
import FilterBar from '../FilterBar/FilterBar.js';
import JobsFilter from '../JobsFilter/JobsFilter.js';
import {createModal} from '../SiteModalStore/SiteModalStore.js';
import RerunJobsModal from '../RerunJobsModal/RerunJobsModal.js';
import _ from 'lodash';
import {getRunTags, formatLast, getUnknownTag} from '../JobsHelper/JobsHelper.js';

// export

@connect((state) => {
  return {
    jobs: state.jobs.byParent,
    runs: state.runs.long || [],
  };
})
export default class JobsRoute extends Component {
  static propTypes = {
    className: PropTypes.string,
    jobs: PropTypes.array,
    runs: PropTypes.array.isRequired,
  };

  state = {
    jobs: null,
  };

  componentDidMount() {
    queryJobs();
    this.interval = setInterval(::this.tick, 1000 * 30 * 1);
    this.tick();

    if (!this.props.jobs) {
      enableSiteLoader('route-jobs');
    }

    if (!this.props.runs) {
      enableSiteLoader('route-runs');
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.jobs && !prevProps.jobs) {
      disableSiteLoader('route-jobs');
    }

    if (this.props.runs && !prevProps.runs) {
      disableSiteLoader('route-runs');
    }

    if (prevProps.runs !== this.props.runs || prevProps.jobs !== this.props.jobs) {
      this.filterJobs();
    }
  }

  componentWillUnmount() {
    clearInterval(this.interval);
    this.interval = null;
  }

  tick() {
    queryLongHistory();
  }

  className() {
    return cn(styles.JobsRoute, this.props.className);
  }

  filterJobs(jobs) {
    if (!jobs) {
      jobs = this.state.jobs.length ? this.state.jobs : this.props.jobs;
    }

    const runs = (this.props.runs || []).map(formatLast);

    jobs = jobs.map((job) => {
      job = _.cloneDeep(job);

      runs.some((run) => {
        if (run.id === job.id) {
          job.statusTags = getRunTags(run, true);
          return true;
        }

        return false;
      });

      if (!job.enabled) {
        job.statusTags = [getUnknownTag('disabled')];
      } else if (!job.statusTags) {
        job.statusTags = [getUnknownTag()];
      }

      return job;
    });

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
