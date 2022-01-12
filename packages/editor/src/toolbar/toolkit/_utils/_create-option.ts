import { createElement, createTextNode } from '@textbus/browser'
import { Keymap } from '@textbus/core'

import { createKeymap } from './_create-keymap'

export interface OptionConfig {
  label?: string
  iconClasses?: string[]
  classes?: string[]
  onClick(): void
  keymap?: Keymap
}

export function createOption(config: OptionConfig) {
  return createElement('button', {
    classes: ['textbus-toolbar-option'],
    children: [
      config.iconClasses ? createElement('span', {
        classes: ['textbus-toolbar-option-icon', ...(config.iconClasses || [])]
      }) : null,
      createElement('span', {
        classes: ['textbus-toolbar-option-label', ...(config.classes ||[])],
        children: config.label ? [createTextNode(config.label)] : []
      }),
      config.keymap ? createElement('span', {
        classes: ['textbus-toolbar-option-keymap'],
        children: createKeymap(config.keymap)
      }) : null
    ],
    on: {
      click() {
        config.onClick()
      }
    }
  })
}
