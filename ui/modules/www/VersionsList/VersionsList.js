// import

import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';
import cn from 'classnames';
import styles from './VersionsList.css';
import shared from '../Styles/Shared.css';
import {getJobVersions, selectJobVersion} from '../JobsStore/JobsStore.js';
import moment from 'moment';

// export

@connect((state, props) => {
  return {
    job: state.jobs.jobs[props.id] || null,
    version: state.jobs.versionSelected[props.id],
    versions: state.jobs.versions[props.id],
  };
})
export default class VersionsList extends Component {
  static propTypes = {
    className: PropTypes.string,
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

  render() {
    const {className, version, versions, job} = this.props;
    const reversed = (versions || []).slice(0).reverse();

    return (
      <aside className={cn(shared.sidebar, className)}>
        <nav className={cn(shared.sidebarHeader, shared.tabs)}>
          <div className={cn(shared.tab, shared.activeTab)}>revisions</div>
        </nav>

        <div className={cn(shared.sidebarContent)}>
          {reversed.map((v, i) => {
            return (
              <section key={i} className={cn(styles.item, styles.version, {
                [styles.activeVersion]: version ? v.lastModified === version.lastModified : i === 0,
              })} onClick={() => selectJobVersion(job, v)}>
                {moment(v.lastModified).format('h:mma on MMM D, YYYY')}
              </section>
            );
          })}
        </div>
      </aside>
    );
  }
}
