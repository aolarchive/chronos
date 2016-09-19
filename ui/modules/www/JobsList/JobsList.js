// import

import React, {Component, PropTypes} from 'react';
import styles from './JobsList.css';
import cn from 'classnames';
import _ from 'lodash';
import {getJobType, getJobNiceInterval, orderJobs, flattenJobs} from '../JobsHelper/JobsHelper.js';
import {routeJobUpdate} from '../RouterStore/RouterStore.js';
import {connect} from 'react-redux';

// export

@connect((state) => {
  return {
    useLocalTime: state.localStorage.useLocalTime === 'true',
  };
})
export default class JobsList extends Component {
  static propTypes = {
    className: PropTypes.string,
    jobs: PropTypes.array,
    useLocalTime: PropTypes.bool.isRequired,
  };

  state = {
    orderBy: 'name',
    orderDir: 'asc',
  };

  className() {
    return cn(styles.JobsList, this.props.className);
  }

  cellClassName(field, head = false) {
    const headClass = head && this.state.orderBy === field && {
      [styles.orderBy]: true,
      [styles.orderAsc]: this.state.orderDir === 'asc',
      [styles.orderDesc]: this.state.orderDir === 'desc',
    };

    return cn(styles.cell, styles['cell' + _.capitalize(field)], headClass);
  }

  changeOrder(orderBy) {
    return () => {
      this.setState({
        orderBy,
        orderDir: this.state.orderBy !== orderBy ? 'asc' : this.state.orderDir === 'asc' ? 'desc' : 'asc',
      });
    };
  }

  viewJobs(job) {
    return () => {
      routeJobUpdate(job);
    };
  }

  render() {
    const {jobs, useLocalTime} = this.props;
    const {orderBy, orderDir} = this.state;

    return (
      <table className={this.className()}>
        <thead className={styles.head}>
          <tr className={styles.row}>
            <th className={this.cellClassName('enabled', true)}
              onClick={this.changeOrder('enabled')}>
              <div className={styles.enabled}/>
            </th>

            <th className={this.cellClassName('type', true)}
              onClick={this.changeOrder('type')}>
              <div className={cn(styles.icon, 'icon icon-query')}/>
            </th>

            <th className={this.cellClassName('name', true)}
              onClick={this.changeOrder('name')}>
              Job
            </th>

            <th className={this.cellClassName('status', true)}
              onClick={this.changeOrder('status')}>
              Status
            </th>

            <th className={this.cellClassName('interval', true)}
              onClick={this.changeOrder('interval')}>
              Run Interval
            </th>
          </tr>
        </thead>

        <tbody className={styles.body}>
          {orderJobs(jobs, orderBy, orderDir)
            .reduce(flattenJobs.bind(flattenJobs, 0), [])
            .map((job, i) => {
              return (
                <tr key={i} className={cn(styles.row, !job.shouldKeep && styles.gray)} onClick={this.viewJobs(job)}>
                  <td className={this.cellClassName('enabled')}>
                    {job.enabled && <div className={styles.enabled}/>}
                  </td>

                  <td className={this.cellClassName('type')}>
                    <div className={cn(styles.icon, 'icon icon-' + getJobType(job))}/>
                  </td>

                  <td className={this.cellClassName('name')}>
                    {_.repeat(' ', job.depth).split('').map((char, k) => {
                      return (<span key={k} className={cn(styles.indent, k + 1 === job.depth && styles.lastIndent)}/>);
                    }).concat(job.name)}
                  </td>

                  <td className={this.cellClassName('status')}>
                    {job.statusTags}
                  </td>

                  <td className={this.cellClassName('interval')}>
                    {(job.parent ? '' : getJobNiceInterval(job.cronString, useLocalTime) || '').toLowerCase()}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    );
  }
}
