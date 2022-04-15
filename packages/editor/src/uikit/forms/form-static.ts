import { createElement, createTextNode } from '@textbus/browser'

import { FormStaticParams, AttrState, FormItem } from './help'

export class FormStatic implements FormItem {
  readonly elementRef: HTMLElement
  readonly name!: string

  constructor(private config: FormStaticParams) {
    this.elementRef = createElement('div', {
      classes: ['textbus-form-group'],
      children: [
        config.label ? createElement('div', {
          classes: ['textbus-control-label'],
          children: [createTextNode(config.label)]
        }) : null as any,
        createElement('div', {
          classes: ['textbus-control-value'],
          children: [
            typeof config.content === 'string' ? createTextNode(config.content) : config.content
          ]
        })
      ]
    })
  }

  reset() {
    //
  }

  update(): void {
    // this.value = value;
  }

  getAttr(): AttrState<any> {
    return null as any
  }

  validate() {
    return true
  }
}
