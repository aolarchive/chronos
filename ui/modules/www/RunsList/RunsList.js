// import

import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';
import {queryHistory, queryFuture, rerunRun} from '../RunStore/RunStore';
import moment from 'moment';
import {routeJobUpdate} from '../RouterStore/RouterStore';
import _ from 'lodash';

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
  if (!props.routeParams.id) {
    return {
      job: null,
      last: state.runs.last,
      next: state.runs.next,
    };
  }

  const runs = state.runs.jobs[props.routeParams.id];

  return {
    job: state.jobs.jobs[props.routeParams.id],
    last: runs ? runs.last : null,
    next: runs ? runs.next : null,
  };
})
export default class RunsList extends Component {
  static propTypes = {
    job: PropTypes.object,
    last: PropTypes.array,
    next: PropTypes.array,
    routeParams: PropTypes.object.isRequired,
  };

  state = {
    last: true,
  };

  componentDidMount() {
    this.interval = setInterval(::this.tick, 1000 * 60 * 1);
    this.tick();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.routeParams.id !== this.props.routeParams.id || prevProps.job !== this.props.job || prevState.last !== this.state.last) {
      this.tick();
    }
  }

  componentWillUnmount() {
    clearInterval(this.interval);
    this.interval = null;
  }

  tick() {
    (this.state.last ? queryHistory : queryFuture)(this.props.routeParams.id);
  }

  navLinkClassName(last) {
    const cls = ['runs-list-nav-link'];

    if (this.state.last === last) {
      cls.push('active');
    }

    return cls.join(' ');
  }

  runClassName(run) {
    const cls = ['runs-list-item'];

    if (run.id && !run.success) {
      cls.push('error');
    }

    return cls.join(' ');
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
    return (
      <aside id="runs-list" className="runs-list">
        <nav className="runs-list-nav-links">
          <div className={this.navLinkClassName(true)} onClick={::this.setPast}>last run</div>
          <div className={this.navLinkClassName(false)} onClick={::this.setFuture}>next run</div>
        </nav>

        <div className="runs-list-items">
          {this.getRunsArray().map((run, i) => {
            run = this.state.last ? formatLast(run) : formatNext(run);

            return (
              <section key={i} className={this.runClassName(run)}>
                <header className="runs-list-item-header">
                  <div className="runs-list-item-name" dangerouslySetInnerHTML={{__html: run.niceName}}/>

                  <time className="runs-list-item-time">
                    {moment(run.time).format('M/D/YY')}
                  </time>
                </header>

                {run.err &&
                <div className="runs-list-item-body">
                  {run.err}
                </div>}

                <footer className="runs-list-item-footer cf">
                  <time className="runs-list-item-time">
                    {moment(run.time).format('h:mm A')}
                  </time>

                  <div className="runs-list-item-actions">
                    {!this.props.routeParams.id && this.state.last ? <span className="runs-list-item-action action-view" onClick={this.view(run)}>view</span> : null}
                    {!this.state.last ? null : <span className="runs-list-item-action action-rerun" onClick={this.rerun(run)}>re-run</span>}
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
