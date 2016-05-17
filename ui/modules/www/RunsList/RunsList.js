// import

import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';
import {queryHistory, queryFuture, rerunRun, cancelRun} from '../RunStore/RunStore';
import moment from 'moment';
import {routeJobUpdate} from '../RouterStore/RouterStore';
import _ from 'lodash';
import cn from 'classnames';
import styles from './RunsList.css';
import shared from '../Styles/Shared.css';

// fns

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
  });
}

function formatNext(run) {
  return formatRun({
    name: run.name,
    time: run.time ? moment(run.time) : null,
  });
}

// export

@connect((state, props) => {
  if (!props.id) {
    return {
      job: null,
      last: state.runs.last,
      next: state.runs.next,
    };
  }

  const runs = state.runs.jobs[props.id];

  return {
    job: state.jobs.jobs[props.id],
    last: runs ? runs.last : null,
    next: runs ? runs.next : null,
  };
})
export default class RunsList extends Component {
  static propTypes = {
    className: PropTypes.string,
    id: PropTypes.string,
    job: PropTypes.object,
    last: PropTypes.array,
    next: PropTypes.array,
  };

  state = {
    tab: 'last',
  };

  componentDidMount() {
    this.interval = setInterval(::this.tick, 1000 * 60 * 1);
    this.tick();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.id !== this.props.id || prevProps.job !== this.props.job || prevState.tab !== this.state.tab) {
      this.tick();
    }
  }

  componentWillUnmount() {
    clearInterval(this.interval);
    this.interval = null;
  }

  tick() {
    (this.state.tab === 'last' ? queryHistory : queryFuture)(this.props.id);
  }

  navLinkClassName(tab) {
    return cn(shared.tab, {
      [shared.activeTab]: this.state.tab === tab,
    });
  }

  runClassName(run) {
    return cn(styles.item, {
      [styles.pending]: run.pending,
      [styles.error]: run.error,
    });
  }

  setPast() {
    this.setState({tab: 'last'});
  }

  setFuture() {
    this.setState({tab: 'next'});
  }

  setQueue() {
    this.setState({tab: 'queue'});
  }

  view(run) {
    return () => {
      routeJobUpdate(run.jobId);
    };
  }

  rerun(run) {
    return () => {
      rerunRun(run.id)
      .then(() => {
        this.tick();
      });
    };
  }

  cancel(i) {
    return () => {
      cancelRun(this.props.last[i])
      .then(() => {
        this.tick();
      });
    };
  }

  getRunsArray() {
    const runs = this.props[this.state.tab];
    return runs || [];
  }

  render() {
    const {className, ...props} = this.props;

    return (
      <aside className={cn(styles.RunsList, className)}>
        <nav className={shared.tabs}>
          <div className={this.navLinkClassName('last')} onClick={::this.setPast}>last</div>
          <div className={this.navLinkClassName('next')} onClick={::this.setFuture}>next</div>
        </nav>

        <div className={styles.items}>
          {this.getRunsArray().map((run, i) => {
            run = this.state.tab === 'last' ? formatLast(run) : formatNext(run);

            return (
              <section key={i} className={this.runClassName(run)}>
                <header className={styles.itemHeader}>
                  <div className={styles.name} dangerouslySetInnerHTML={{__html: run.niceName}}/>

                  {run.time ? (
                    <time className={styles.time}>
                      {moment(run.time).format('M/D/YY')}
                    </time>
                  ) : null}
                </header>

                {run.err &&
                <div className={styles.body}>
                  {run.err}
                </div>}

                <footer className={cn(styles.itemFooter, shared.clearfix)}>
                  {run.time ? (
                    <time className={styles.time}>
                      {moment(run.time).format('h:mm A')}
                    </time>
                  ) : null}

                  <div className={styles.actions}>
                    {!this.props.id && this.state.tab === 'last' ? (
                      <span className={styles.action} onClick={this.view(run)}>
                        view
                      </span>
                    ) : null}

                    {this.state.tab === 'last' && !run.pending ? (
                      <span className={styles.action} onClick={this.rerun(run)}>
                        re-run
                      </span>
                    ) : null}

                    {this.state.tab === 'last' && run.pending ? (
                      <span className={styles.action} onClick={this.cancel(i)}>
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
