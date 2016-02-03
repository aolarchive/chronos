// import

import React, {Component, PropTypes} from 'react';
import DocumentTitle from 'react-document-title';
import FilterBar from '../FilterBar/FilterBar.js';
import {updateLoader} from '../LoaderStore/LoaderStore.js';
import {queryJobs} from '../JobStore/JobStore.js';
import {connect} from 'react-redux';
import {routeJobUpdate} from '../RouterStore/RouterStore.js';
import RerunJobsModal from '../RerunJobsModal/RerunJobsModal.js';
import {createModal} from '../ModalStore/ModalStore.js';
import _ from 'lodash';
import cn from 'classnames';

// vars

const daysOfWeek = [
  'Sundays',
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
];

const intervals = [
  'Hourly',
  'Daily',
  'Weekly',
  'Monthly',
];

const types = [
  'script',
  'query',
  'report',
];

// fns

function getJobType(job) {
  return job.resultQuery && job.resultQuery.trim() ? 'report' : job.type === 'Script' ? 'script' : 'query';
}

function jobContainsText(job, textArr) {
  if (textArr.length === 0) {
    return true;
  }

  return textArr.every((text) => {
    return _.some(job, (val) => {
      if (!_.isString(val)) {
        return false;
      }

      return text && _.includes(val.toString().toLowerCase(), text);
    });
  });
}

function nextRun(job) {
  switch (job.interval) {
  case 'Hourly':
    return `Hourly at :${_.padStart(job.startMinute, 2, '0')}`;
  case 'Daily':
    return `Daily at ${job.startHour}:${_.padStart(job.startMinute, 2, '0')}`;
  case 'Weekly':
    return `${daysOfWeek[job.startDay % 7]} at ${job.startHour}:${_.padStart(job.startMinute, 2, '0')}`;
  case 'Monthly':
    return `Monthly at ${job.startHour}:${_.padStart(job.startMinute, 2, '0')}`;
  }

  return 'N/A';
}

const sortFns = {
  name(job) {
    return job.name.toLowerCase().trim();
  },

  type(job) {
    return [
      types.indexOf(getJobType(job)),
      job.name.toLowerCase().trim(),
    ].join(' ');
  },

  enabled(job) {
    return [
      (job.enabled ? 0 : 1),
      job.name.toLowerCase().trim(),
    ].join(' ');
  },

  interval(job) {
    return [
      intervals.indexOf(job.interval),
      job.interval === 'Weekly' ? _.padStart(job.startDay, 2, '0') : '00',
      job.interval !== 'Hourly' ? _.padStart(job.startHour, 2, '0') : '00',
      _.padStart(job.startMinute, 2, '0'),
      (job.enabled ? 0 : 1),
      job.name.toLowerCase().trim(),
    ].join(' ');
  },
};

// export

@connect((state) => {
  return {
    jobs: state.jobs.query,
    loader: state.loader.global || {},
  };
})
export default class JobsRoute extends Component {
  static propTypes = {
    jobs: PropTypes.array,
    loader: PropTypes.object.isRequired,
  };

  state = {
    filters: {
      text: [],
    },
    sortDir: 'asc',
    sortBy: 'name',
  };

  componentDidMount() {
    queryJobs();
    updateLoader('global', {active: true});
  }

  componentDidUpdate() {
    if (this.props.jobs && this.props.loader.active) {
      updateLoader('global', {active: false});
    }
  }

  getJobs() {
    if (!this.props.jobs) {
      return [];
    }

    return _.chain(this.props.jobs)
    .filter((job) => {
      return jobContainsText(job, this.state.filters.text);
    })
    .orderBy([sortFns[this.state.sortBy]], [this.state.sortDir])
    .value();
  }

  getJobsDOM() {
    return (this.getJobs()).map((job, i) => {
      const jobType = getJobType(job);

      return (
        <tr key={i} onClick={this.viewJob(job)}>
          <td className="jobs-list-icon">
            {job.enabled ? (
              <div className="jobs-list-enabled"/>
            ) : null}
          </td>
          <td className="jobs-list-type">
            <div className={'jobs-list-type-icon icon icon-' + jobType}/>
          </td>
          <td className="jobs-list-name">{job.name}</td>
          <td className="jobs-list-next">{nextRun(job).toLowerCase()}</td>
        </tr>
      );
    });
  }

  viewJob(job) {
    return () => {
      routeJobUpdate(job);
    };
  }

  readFilters(event) {
    this.setState({filters: {text: _.compact(event.target.value.toLowerCase().split(' '))}});
  }

  rerun() {
    createModal({
      title: 'Re-Run All Jobs',
      component: RerunJobsModal,
      props: {
        jobs: this.getJobs(),
      },
    });
  }

  sortClick(sortBy) {
    return () => {
      this.setState({
        sortBy,
        sortDir: this.state.sortBy !== sortBy ? 'asc' : this.state.sortDir === 'asc' ? 'desc' : 'asc',
      });
    };
  }

  hrClassName(key, cls) {
    return cn(cls, {
      sorted: this.state.sortBy === key,
      sortedAsc: this.state.sortBy === key && this.state.sortDir === 'asc',
      sortedDesc: this.state.sortBy === key && this.state.sortDir === 'desc',
    });
  }

  render() {
    return (
      <DocumentTitle title={'Jobs List || Chronos'}>
        <main id="route-jobs" className="site-main route-jobs">
          <FilterBar>
            <input ref="textFilter" className="jobs-filter jobs-filter-text" type="text" placeholder="Search" onChange={::this.readFilters}/>

            <button className="job-button job-button-run" onClick={::this.rerun}>Re-run</button>
          </FilterBar>

          <table className="jobs-list">
            <thead className="jobs-list-head">
              <tr>
                <th className={this.hrClassName('enabled', 'jobs-list-icon')} onClick={this.sortClick('enabled')}>
                  <div className="jobs-list-enabled"/>
                </th>
                <th className={this.hrClassName('type', 'jobs-list-type')} onClick={this.sortClick('type')}>
                  <div className={'jobs-list-type-icon icon icon-query'}/>
                </th>
                <th className={this.hrClassName('name', 'jobs-list-name')} onClick={this.sortClick('name')}>Job</th>
                <th className={this.hrClassName('interval', 'jobs-list-next')} onClick={this.sortClick('interval')}>Run Interval</th>
              </tr>
            </thead>

            <tbody className="jobs-list-body">
              {this.getJobsDOM()}
            </tbody>
          </table>
        </main>
      </DocumentTitle>
    );
  }
}
