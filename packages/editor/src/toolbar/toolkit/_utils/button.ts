import { createElement, createTextNode, Keymap } from '@textbus/browser'

export interface UIButtonConfig {
  iconClasses?: string[]
  label?: string
  tooltip?: string
  onClick(): void
  keymap?: Keymap
}

export interface UIButton {
  elementRef: HTMLElement
  disabled: boolean
  highlight: boolean
}

export function createButton(config: UIButtonConfig): UIButton {
  const button = createElement('button', {
    classes: ['textbus-toolbar-button'],
    attrs: {
      title: config.tooltip || '',
      type: 'button',
      'data-keymap': JSON.stringify(config.keymap)
    },
    children: [
      createElement('span', {
        classes: config.iconClasses
      }),
      createElement('span', {
        classes: ['textbus-toolbar-label'],
        children: [config.label ? createTextNode(config.label) : null]
      })
    ],
    on: {
      click() {
        config.onClick()
      }
    }
  }) as HTMLButtonElement
  const element = createElement('span', {
    classes: ['textbus-toolbar-item'],
    children: [
      button
    ]
  })
  let highlight = false
  let disabled = false
  return {
    elementRef: element,
    get highlight() {
      return highlight
    },
    set highlight(v: boolean) {
      highlight = v
      if (v) {
        button.classList.add('textbus-toolbar-button-active')
      } else {
        button.classList.remove('textbus-toolbar-button-active')
      }
    },
    get disabled() {
      return disabled
    },
    set disabled(v: boolean) {
      disabled = v
      button.disabled = v
    }
  }
}
