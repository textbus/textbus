import { createElement, createTextNode } from '@textbus/browser'

import { AttrState, FormButtonParams, FormItem } from './help'

export class FormButton implements FormItem {
  elementRef = createElement('div', {
    classes: ['textbus-form-group'],
    children: [
      createElement('div', {
        classes: ['textbus-control-label'],
        children: [createTextNode(this.config.label)]
      }),
      createElement('div', {
        classes: ['textbus-control-value'],
        children: [
          createElement('button', {
            classes: ['textbus-btn', 'textbus-btn-dark'],
            attrs: {
              type: 'button'
            },
            on: {
              click: () => {
                this.config.onClick()
              }
            },
            children: [
              createElement('span', {
                classes: this.config.iconClasses
              }),
              createTextNode(' ' + this.config.btnText)
            ]
          })
        ]
      })
    ]
  })
  name = this.config.name

  constructor(private config: FormButtonParams) {
  }

  reset() {
    //
  }

  update(): void {
    // this.value = value;
  }

  getAttr(): AttrState<any> {
    return {
      name: this.name,
      value: this.config.value
    }
  }

  validate() {
    return true
  }
}
