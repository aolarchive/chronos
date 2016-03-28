// import

import React, {Component, PropTypes} from 'react';
import {reduxForm} from 'redux-form';
import {deleteModal} from '../SiteModalStore/SiteModalStore';
import formStyles from '../Styles/Form.css';
import cn from 'classnames';
import styles from './DeleteJobForm.css';

// export

@reduxForm({
  form: 'deleteJob',
  fields: ['job'],
  validate() {
    return {};
  },
})
export default class DeleteJobForm extends Component {
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
    this.props.initializeForm({
      job: this.props.job,
    });
  }

  render() {
    const {handleSubmit} = this.props;

    return (
      <form onSubmit={handleSubmit}>
        <p>Are you sure you want to delete job <strong>{this.props.job.name}</strong>?</p>

        <div className={styles.buttonGroup}>
          <button className={cn(formStyles.button, formStyles.buttonPrimary, styles.button)} onClick={handleSubmit}>Delete</button>

          <button className={cn(formStyles.button, formStyles.hollowButton, styles.hollowButton)} type="button" onClick={deleteModal}>
            <span>Cancel</span>
          </button>
        </div>
      </form>
    );
  }
}
