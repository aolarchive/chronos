// import

import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';
import cn from 'classnames';
import styles from './VersionsList.css';
import shared from '../Styles/Shared.css';
import {getJobVersions, selectJobVersion, selectDiffView} from '../JobsStore/JobsStore.js';
import {getJobDiff} from '../JobsHelper/JobsHelper.js';
import moment from 'moment';
import Codemirror from 'react-codemirror';
import {diffOpts} from '../CodeHelper/CodeHelper.js';
import _ from 'lodash';
import formStyles from '../Styles/Form.css';

// export

@connect((state, props) => {
  return {
    job: state.jobs.jobs[props.id] || null,
    version: state.jobs.versionSelected[props.id],
    versions: state.jobs.versions[props.id],
    diffView: state.jobs.diffView,
  };
})
export default class VersionsList extends Component {
  static propTypes = {
    className: PropTypes.string,
    diffView: PropTypes.string.isRequired,
    id: PropTypes.string,
    job: PropTypes.object,
    version: PropTypes.object,
    versions: PropTypes.array,
  };

  componentDidMount() {
    getJobVersions(this.props.id);
  }

  navLinkClassName(tab) {
    return cn(shared.tab, {
      [shared.activeTab]: this.props.tab === tab,
    });
  }

  selectView(e) {
    selectDiffView(e.target.value);
  }

  makeOpts(opts) {
    return _.assign({
      readOnly: 'nocursor',
      showCursorWhenSelecting: false,
    }, opts, {
      lineNumbers: false,
    });
  }

  render() {
    const {className, version, versions, job, diffView} = this.props;
    const reversed = (versions || []).slice(0).reverse();

    return (
      <aside className={cn(shared.sidebar, className)}>
        <nav className={cn(shared.sidebarHeader, shared.tabs)}>
          <div className={cn(shared.tab, shared.activeTab)}>revisions</div>
        </nav>

        <footer className={cn(styles.footer)}>
          <div className={formStyles.selectOverlay}/>
          <select onChange={::this.selectView} className={cn(formStyles.input, styles.input)} defaultValue={diffView}>
            <option value="current">Compare with current version</option>
            <option value="history">Compare with previous version</option>
            <option value="none">Disable comparison engine</option>
          </select>
        </footer>

        <div className={cn(shared.sidebarContent, styles.sidebarContent)}>
          {job && reversed.map((v, i) => {
            const prev = diffView === 'current' ? job : versions[i + 1];
            const diff = (getJobDiff(prev, v, 'code') || getJobDiff(prev, v, 'resultQuery'))
            .split('\n')
            .reduce((agg, line) => {
              if (line.slice(0, 1) !== ' ' && line.trim().length > 2) {
                agg.push(line);
              }

              return agg;
            }, [])
            .slice(0, 5)
            .join('\n');

            return (
              <section key={i} className={cn(styles.item, styles.version, {
                [styles.activeVersion]: version ? v.lastModified === version.lastModified : i === 0,
              })} onClick={() => selectJobVersion(job, v)}>
                <header className={styles.itemHeader}>
                  <div className={styles.name}>
                    {moment(v.lastModified).format('h:mma on MMM D, YYYY')}
                  </div>
                </header>

                {diff && diffView !== 'none' && (
                  <Codemirror key={i + diffView} value={diff} options={this.makeOpts(diffOpts)}/>
                )}
              </section>
            );
          })}
        </div>
      </aside>
    );
  }
}
