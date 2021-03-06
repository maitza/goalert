import React from 'react'
import p from 'prop-types'
import MountWatcher from '../util/MountWatcher'

import { FormContext, FormContainerContext } from './context'
import { get, set } from 'lodash-es'

// FormContainer handles grouping multiple FormFields.
// It works with the Form component to handle validation.
export class FormContainer extends React.PureComponent {
  static propTypes = {
    value: p.object,
    errors: p.arrayOf(
      p.shape({
        field: p.string.isRequired,
        message: p.string.isRequired,
      }),
    ),
    onChange: p.func,
    disabled: p.bool,

    mapValue: p.func,
    mapOnChangeValue: p.func,

    // If true, will render optional fields with `(optional)` appended to the label.
    // In addition, required fields will not be appended with `*`.
    optionalLabels: p.bool,
  }

  static defaultProps = {
    errors: [],
    value: {},
    onChange: () => {},

    mapValue: value => value,
    mapOnChangeValue: value => value,
  }

  state = {
    validationErrors: [],
  }

  _fields = {}

  addField = (fieldName, validate) => {
    if (!this._fields[fieldName]) {
      this._fields[fieldName] = []
    }
    this._fields[fieldName].push(validate)

    return () => {
      this._fields[fieldName] = this._fields[fieldName].filter(
        v => v !== validate,
      )
      if (this._fields[fieldName].length === 0) {
        delete this._fields[fieldName]
      }
    }
  }

  onSubmit = (...args) => {
    const validate = field => {
      let err
      // find first error
      this._fields[field].find(validate => {
        err = validate(get(this.props.value, field))
        return err
      })
      if (err) err.field = field
      return err
    }
    const validationErrors = Object.keys(this._fields)
      .map(validate)
      .filter(e => e)
    this.setState({ validationErrors })
    if (validationErrors.length) return false

    return true
  }

  onChange = (fieldName, e) => {
    let value = e
    if (e && e.target) {
      value = e.target.value
    }
    const { value: oldValue, mapValue, mapOnChangeValue } = this.props
    this.props.onChange(
      mapOnChangeValue(
        set(
          mapValue({
            ...oldValue,
          }),
          fieldName,
          value,
        ),
      ),
    )
  }

  render() {
    return <FormContext.Consumer>{this.renderComponent}</FormContext.Consumer>
  }

  renderComponent = ({ disabled: formDisabled, addSubmitCheck }) => {
    const {
      value,
      mapValue,
      optionalLabels,
      disabled: containerDisabled,
    } = this.props

    return (
      <MountWatcher
        onMount={() => {
          this._unregister = addSubmitCheck(this.onSubmit)
        }}
        onUnmount={() => {
          this._unregister()
        }}
      >
        <FormContainerContext.Provider
          value={{
            value: mapValue(value),
            disabled: formDisabled || containerDisabled,
            errors: this.state.validationErrors.concat(this.props.errors),
            onChange: this.onChange,
            addField: this.addField,
            optionalLabels: optionalLabels,
          }}
        >
          {this.props.children}
        </FormContainerContext.Provider>
      </MountWatcher>
    )
  }
}
