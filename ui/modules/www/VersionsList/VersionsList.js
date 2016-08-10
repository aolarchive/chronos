// import

import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';
import cn from 'classnames';
import styles from './VersionsList.css';
import shared from '../Styles/Shared.css';
import {getJobVersions} from '../JobsStore/JobsStore.js';
import moment from 'moment';

// export

@connect((state, props) => {
  return {
    job: state.jobs.jobs[props.id] || null,
    versions: state.jobs.versions[props.id] || [],
  };
})
export default class VersionsList extends Component {
  static propTypes = {
    className: PropTypes.string,
    id: PropTypes.string,
    job: PropTypes.object,
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
    const {className, versions} = this.props;
    const reversed = versions.slice(0).reverse();

    return (
      <aside className={cn(shared.sidebar, className)}>
        <nav className={cn(shared.sidebarHeader, shared.tabs)}>
          <div className={cn(shared.tab, shared.activeTab)}>revisions</div>
        </nav>

        <div className={cn(shared.sidebarContent)}>
          {reversed.map((v, i) => {
            return (
              <section key={i} className={cn(styles.item, styles.version, styles.activeVersion)}>
                {moment(v).format('h:mma on MMM D, YYYY')}
              </section>
            );
          })}
        </div>
      </aside>
    );
  }
}
