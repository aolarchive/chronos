// import

import React, {Component, PropTypes} from 'react';
import {reduxForm} from 'redux-form';
import formStyles from '../Styles/Form.css';
import cn from 'classnames';

// export

@reduxForm({
  form: 'copy',
  fields: ['name'],
  validate() {
    return {};
  },
})
export default class CopyJobForm extends Component {
  static propTypes = {
    fields: PropTypes.object.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    initializeForm: PropTypes.func.isRequired,
    job: PropTypes.object.isRequired,
    resetForm: PropTypes.func.isRequired,
  };

  componentDidMount() {
    this.updateForm();
  }

  componentWillUpdate(nextProps) {
    if (this.props.job !== nextProps.job) {
      this.updateForm();
    }
  }

  componentWillUnmount() {
    this.props.resetForm();
  }

  updateForm() {
    const {job, initializeForm} = this.props;

    initializeForm({
      name: job.name + ' (copy)',
    });
  }

  render() {
    const {fields: {name}, handleSubmit} = this.props;

    return (
      <form onSubmit={handleSubmit}>
        <div className={formStyles.affixGroup}>
          <label className={formStyles.affix}>Name</label>
          <input {...name} type="text" className={cn(formStyles.input, formStyles.affixed)}/>
        </div>

        <button className={cn(formStyles.button, formStyles.buttonPrimary, formStyles.modalButton)} onClick={handleSubmit}>Copy</button>
      </form>
    );
  }
}
