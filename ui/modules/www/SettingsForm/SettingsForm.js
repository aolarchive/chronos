// import

import React, {Component, PropTypes} from 'react';
import {reduxForm} from 'redux-form';
import formStyles from '../Styles/Form.css';
import cn from 'classnames';

// export

@reduxForm({
  form: 'rerun',
  fields: ['hideSidebar', 'useLocalTime'],
  initialValues: {
    intervals: [],
  },
  validate: function validateRerunJobsForm() {
    return {};
  },
})
export default class SettingsForm extends Component {
  static propTypes = {
    end: PropTypes.string,
    fields: PropTypes.object.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    initializeForm: PropTypes.func.isRequired,
    resetForm: PropTypes.func.isRequired,
    settings: PropTypes.object.isRequired,
    start: PropTypes.string,
  };

  componentDidMount() {
    this.updateForm();
  }

  componentWillUpdate(nextProps) {
    if (this.props.settings !== nextProps.settings) {
      this.updateForm();
    }
  }

  componentWillUnmount() {
    this.props.resetForm();
  }

  updateForm() {
    this.props.initializeForm({
      hideSidebar: this.props.settings.hideSidebar || 'false',
      useLocalTime: this.props.settings.useLocalTime || 'false',
    });
  }

  intervalSelect(interval) {
    const intervals = this.props.fields.intervals;

    return (event) => {
      if (event.target.checked) {
        intervals.onChange((intervals.value || intervals.defaultValue).concat(interval));
      } else {
        intervals.onChange(intervals.value.splice(intervals.value.indexOf(interval), 1));
      }
    };
  }

  render() {
    const {fields: {hideSidebar, useLocalTime}, handleSubmit} = this.props;

    return (
      <form onSubmit={handleSubmit}>
        <div className={formStyles.affixGroup}>
          <label className={formStyles.affix}>Sidebar</label>
          <select {...hideSidebar} value={hideSidebar.value || ''} className={cn(formStyles.input, formStyles.affixed)}>
            <option value="false">Show Sidebar</option>
            <option value="true">Hide Sidebar</option>
          </select>
        </div>

        <div className={formStyles.affixGroup}>
          <label className={formStyles.affix}>Date/Time</label>
          <select {...useLocalTime} value={useLocalTime.value || ''} className={cn(formStyles.input, formStyles.affixed)}>
            <option value="true">Use Local Time</option>
            <option value="false">Use GMT Time</option>
          </select>
        </div>

        <button className={cn(formStyles.button, formStyles.buttonPrimary, formStyles.modalButton)} onClick={handleSubmit}>Save</button>
      </form>
    );
  }
}
