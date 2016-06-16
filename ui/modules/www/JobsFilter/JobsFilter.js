// import

import React, {Component, PropTypes} from 'react';
import styles from './JobsFilter.css';
import cn from 'classnames';
import _ from 'lodash';
import {getJobNiceInterval} from '../JobsHelper/JobsHelper.js';
import {connect} from 'react-redux';

// vars

const searchFields = ['code', 'description', 'interval', 'name', 'resultQuery', 'statusEmail', 'resultEmail'];

// export

@connect((state) => {
  return {
    useLocalTime: state.localStorage.useLocalTime === 'true',
  };
})
export default class JobsFilter extends Component {
  static propTypes = {
    className: PropTypes.string,
    jobs: PropTypes.array,
    onFilter: PropTypes.func.isRequired,
    useLocalTime: PropTypes.bool.isRequired,
  };

  state = {
    text: [],
  };

  componentDidMount() {
    this.filterJobs();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.jobs !== prevProps.jobs || this.state.text !== prevState.text) {
      this.filterJobs();
    }
  }

  className() {
    return cn(styles.JobsFilter, this.props.className);
  }

  onChange(event) {
    this.setState({
      text: _.compact(event.target.value.toLowerCase().split(' ')),
    });
  }

  filterJobs() {
    const {useLocalTime} = this.props;
    const textFilter = this.state.text;

    this.props.onFilter((this.props.jobs || []).filter((job) => {
      if (textFilter.length) {
        return textFilter.every((text) => {
          if (_.includes(getJobNiceInterval(job, useLocalTime).toLowerCase(), text)) {
            return true;
          }

          return _.some(job, (val, key) => {
            if (!_.isString(val) || searchFields.indexOf(key) === -1) {
              return false;
            }

            if (Array.isArray(val)) {
              val = val.join(', ');
            }

            return _.includes(val.toLowerCase(), text);
          });
        });
      }

      return true;
    }));
  }

  render() {
    const {className, jobs, onFilter, ...props} = this.props;

    return (
      <input {...props} className={this.className()} type="text" placeholder="Search" onChange={::this.onChange}/>
    );
  }
}
