// import

import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';
import {queryHistory, queryFuture, queryQueue, rerunRun, cancelRun, changeTab} from '../RunStore/RunStore';
import moment from 'moment';
import {routeJobUpdate} from '../RouterStore/RouterStore';
import _ from 'lodash';
import cn from 'classnames';
import styles from './RunsList.css';
import shared from '../Styles/Shared.css';

// fns

function getCardinal(num) {
  switch (num) {
  case 1:
    return '1st';
  case 2:
    return '2nd';
  case 3:
    return '3rd';
  case 4:
    return '4th';
  case 5:
    return '5th';
  }

  return null;
}

function formatRun(run) {
  return _.assign(run, {
    niceName: run.name ? run.name.replace(/_/g, '_<wbr>') : null,
  });
}

function formatLast(run) {
  return formatRun({
    id: run.jobId,
    jobId: run.plannedJob.jobSpec.id,
    name: run.plannedJob.jobSpec.name,
    time: run.start ? moment(run.start) : null,
    err: run.exceptionMessage,
    error: run.finish !== 0 && run.status !== 0,
    pending: run.finish === 0,
    attemptNumber: run.attemptNumber,
    shouldRerun: run.plannedJob.jobSpec.shouldRerun,
  });
}

function formatQueue(run) {
  return formatRun({
    id: null,
    jobId: run.jobSpec.id,
    name: run.jobSpec.name,
    time: run.start ? moment(run.start) : null,
    err: null,
    error: false,
    pending: false,
    attemptNumber: run.attemptNumber,
  });
}

function formatNext(run) {
  return formatRun({
    name: run.name,
    time: run.time ? moment(run.time) : null,
    attemptNumber: run.attemptNumber,
  });
}

// export

@connect((state, props) => {
  const runs = state.runs.jobs[props.id] || state.runs;

  return {
    job: state.jobs.jobs[props.id] || null,
    last: runs ? runs.last : null,
    next: runs ? runs.next : null,
    queue: runs ? runs.queue : null,
    tab: state.runs.tab,
    useLocalTime: state.localStorage.useLocalTime === 'true',
  };
})
export default class RunsList extends Component {
  static propTypes = {
    className: PropTypes.string,
    id: PropTypes.string,
    job: PropTypes.object,
    last: PropTypes.array,
    next: PropTypes.array,
    queue: PropTypes.array,
    tab: PropTypes.string.isRequired,
    useLocalTime: PropTypes.bool.isRequired,
  };

  componentDidMount() {
    this.interval = setInterval(::this.tick, 1000 * 30 * 1);
    this.tick();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.id !== this.props.id || prevProps.job !== this.props.job || prevProps.tab !== this.props.tab) {
      this.tick();
    }
  }

  componentWillUnmount() {
    clearInterval(this.interval);
    this.interval = null;
  }

  tick() {
    const fn = this.props.tab === 'last' ? queryHistory :
      this.props.tab === 'queue' ? queryQueue : queryFuture;
    fn(this.props.id);
  }

  navLinkClassName(tab) {
    return cn(shared.tab, {
      [shared.activeTab]: this.props.tab === tab,
    });
  }

  runClassName(run) {
    return cn(styles.item, {
      [styles.pending]: run.pending,
      [styles.error]: run.error,
    });
  }

  changeTab(tab) {
    return () => {
      changeTab(tab);
    };
  }

  view(run) {
    return () => {
      routeJobUpdate(run.jobId);
    };
  }

  rerun(run) {
    return () => {
      rerunRun(run.id)
      .then(::this.tick, ::this.tick);
    };
  }

  cancel(run) {
    return () => {
      cancelRun(run)
      .then(::this.tick, ::this.tick);
    };
  }

  getRunsArray() {
    const runs = this.props[this.props.tab];
    return runs || [];
  }

  getRunTags(run) {
    const tags = [];

    if (run.pending) {
      tags.push(<div key="running" className={cn(styles.tag, styles.blue)}>running</div>);
    }

    if (run.error) {
      tags.push(<div key="error" className={cn(styles.tag, styles.red)}>error</div>);

      if (run.shouldRerun) {
        if (run.attemptNumber < 5) {
          tags.push(<div key="attempt" className={cn(styles.tag, styles.yellow)}>{getCardinal(run.attemptNumber + 1)} attempt scheduled</div>);
        } else {
          tags.push(<div key="attempt" className={cn(styles.tag, styles.yellow)}>final attempt</div>);
        }
      } else {
        tags.push(<div key="attempt" className={cn(styles.tag, styles.yellow)}>rerun disabled</div>);
      }
    }

    if (run.attemptNumber > 1 && !run.error) {
      tags.push(<div key="attempt" className={cn(styles.tag, styles.yellow)}>{getCardinal(run.attemptNumber)} attempt</div>);
    }

    return tags;
  }

  render() {
    const {className, useLocalTime} = this.props;

    return (
      <aside className={cn(shared.sidebar, className)}>
        <nav className={cn(shared.sidebarHeader, shared.tabs)}>
          <div className={this.navLinkClassName('last')} onClick={::this.changeTab('last')}>last</div>
          <div className={this.navLinkClassName('queue')} onClick={::this.changeTab('queue')}>queue</div>
          <div className={this.navLinkClassName('next')} onClick={::this.changeTab('next')}>next</div>
        </nav>

        <div className={cn(shared.sidebarContent)}>
          {this.getRunsArray().map((run, i) => {
            run = this.props.tab === 'last' ? formatLast(run) : this.props.tab === 'queue' ? formatQueue(run) : formatNext(run);

            return (
              <section key={i} className={this.runClassName(run)}>
                <header className={styles.itemHeader}>
                  <div className={styles.name} dangerouslySetInnerHTML={{__html: run.niceName}}/>

                  {run.time ? (
                    <time className={styles.time}>
                      {run.time[useLocalTime ? 'local' : 'utc']().format('M/D/YY')}
                    </time>
                  ) : null}
                </header>

                <div className={styles.tagWrap}>
                  {this.getRunTags(run)}
                </div>

                {run.err &&
                  <div className={styles.body}>
                    {run.err}
                  </div>}

                <footer className={cn(styles.itemFooter, shared.clearfix)}>
                  {run.time ? (
                    <time className={styles.time}>
                      {run.time[useLocalTime ? 'local' : 'utc']().format('h:mm A')}
                    </time>
                  ) : null}

                  <div className={styles.actions}>
                    {!this.props.job && this.props.tab !== 'next' ? (
                      <span className={styles.action} onClick={this.view(run)}>
                        view
                      </span>
                    ) : null}

                    {this.props.tab === 'last' && !run.pending ? (
                      <span className={styles.action} onClick={this.rerun(run)}>
                        re-run
                      </span>
                    ) : null}

                    {this.props.tab === 'queue' ? (
                      <span className={styles.action} onClick={this.cancel(run)}>
                        cancel
                      </span>
                    ) : null}
                  </div>
                </footer>
              </section>
            );
          })}
        </div>
      </aside>
    );
  }
}
