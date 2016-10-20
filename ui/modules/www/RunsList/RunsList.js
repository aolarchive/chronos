// import

import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';
import {queryHistory, queryFuture, queryQueue, rerunRun, cancelRun, changeTab} from '../RunStore/RunStore';
import moment from 'moment';
import {routeJobUpdate} from '../RouterStore/RouterStore';
import cn from 'classnames';
import styles from './RunsList.css';
import shared from '../Styles/Shared.css';
import {getRunTags, formatNext, formatLast, formatQueue} from '../JobsHelper/JobsHelper.js';

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

                  {run.replaceTime && (
                    <div className={styles.replaceTime}>
                      {moment(run.replaceTime)[useLocalTime ? 'local' : 'utc']().format('M/D/YY')}
                      <br/>
                      {moment(run.replaceTime)[useLocalTime ? 'local' : 'utc']().format('H:mm:ss')}
                    </div>
                  )}
                </header>

                <div className={styles.tagWrap}>
                  {getRunTags(run)}
                </div>

                {run.err && (
                  <div className={styles.body}>
                    {run.err}
                  </div>
                )}

                <footer className={cn(styles.itemFooter, shared.clearfix)}>
                  {run.time ? (
                    <time className={styles.time}>
                      {run.time[useLocalTime ? 'local' : 'utc']().format('M/D/YY H:mm:ss')}
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
