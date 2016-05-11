// import

import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';
import {queryHistory, queryFuture, rerunRun} from '../RunStore/RunStore';
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
    time: moment(run.start),
    err: run.exceptionMessage,
    success: run.success || !run.finish,
  });
}

function formatNext(run) {
  return formatRun({
    name: run.name,
    time: moment(run.time),
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
    last: true,
  };

  componentDidMount() {
    this.interval = setInterval(::this.tick, 1000 * 60 * 1);
    this.tick();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.id !== this.props.id || prevProps.job !== this.props.job || prevState.last !== this.state.last) {
      this.tick();
    }
  }

  componentWillUnmount() {
    clearInterval(this.interval);
    this.interval = null;
  }

  tick() {
    (this.state.last ? queryHistory : queryFuture)(this.props.id);
  }

  navLinkClassName(last) {
    return cn(shared.tab, {
      [shared.activeTab]: this.state.last === last,
    });
  }

  runClassName(run) {
    return cn(styles.item, {
      [styles.error]: run.finish && run.status !== 0,
    });
  }

  setPast() {
    this.setState({last: true});
  }

  setFuture() {
    this.setState({last: false});
  }

  view(run) {
    return () => {
      routeJobUpdate(run.jobId);
    };
  }

  rerun(run) {
    return () => {
      rerunRun(run.id);
    };
  }

  getRunsArray() {
    const runs = this.state.last ? this.props.last : this.props.next;
    return runs || [];
  }

  render() {
    const {className, ...props} = this.props;

    return (
      <aside className={cn(styles.RunsList, className)}>
        <nav className={shared.tabs}>
          <div className={this.navLinkClassName(true)} onClick={::this.setPast}>last run</div>
          <div className={this.navLinkClassName(false)} onClick={::this.setFuture}>next run</div>
        </nav>

        <div className={styles.items}>
          {this.getRunsArray().map((run, i) => {
            run = this.state.last ? formatLast(run) : formatNext(run);

            return (
              <section key={i} className={this.runClassName(run)}>
                <header className={styles.itemHeader}>
                  <div className={styles.name} dangerouslySetInnerHTML={{__html: run.niceName}}/>

                  <time className={styles.time}>
                    {moment(run.time).format('M/D/YY')}
                  </time>
                </header>

                {run.err &&
                <div className={styles.body}>
                  {run.err}
                </div>}

                <footer className={cn(styles.itemFooter, shared.clearfix)}>
                  <time className={styles.time}>
                    {moment(run.time).format('h:mm A')}
                  </time>

                  <div className={styles.actions}>
                    {!this.props.id && this.state.last ? <span className={styles.action} onClick={this.view(run)}>view</span> : null}
                    {!this.state.last ? null : <span className={styles.action} onClick={this.rerun(run)}>re-run</span>}
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
