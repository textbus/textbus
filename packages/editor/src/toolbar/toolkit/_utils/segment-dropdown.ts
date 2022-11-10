import { createElement, createTextNode } from '@textbus/platform-browser'
import { fromEvent } from '@tanbo/stream'

import { createDropdown } from './_create-dropdown'

export interface UISegmentDropdownConfig {
  iconClasses?: string[]
  classes?: string[]
  label?: string
  tooltip?: string
  menuView: HTMLElement
  stickyElement: HTMLElement

  onLeftButtonClick(): void
}

export interface UISegmentDropdown {
  elementRef: HTMLElement
  leftButton: HTMLButtonElement
  disabled: boolean
  highlight: boolean

  hide(): void

  destroy(): void
}

export function createSegmentDropdown(config: UISegmentDropdownConfig): UISegmentDropdown {
  const icon = config.iconClasses ? createElement('span', {
    classes: config.iconClasses
  }) : null
  const label = config.label ? createElement('span', {
    classes: ['textbus-dropdown-label'],
    children: [createTextNode(config.label)]
  }) : null
  const leftButton = createElement('button', {
    classes: ['textbus-toolbar-button', 'textbus-toolbar-dropdown-left-button'],
    attrs: {
      type: 'button'
    },
    children: [icon, label],
    on: {
      click() {
        isSelfClick = true
        dropdown.hide()
        config.onLeftButtonClick()
      }
    }
  }) as HTMLButtonElement
  const rightButton = createElement('button', {
    classes: ['textbus-toolbar-button', 'textbus-toolbar-dropdown-right-button'],
    attrs: {
      type: 'button'
    },
    children: [
      createElement('span', {
        classes: ['textbus-dropdown-caret']
      })
    ],
    on: {
      mousedown() {
        isSelfClick = true
        dropdown.toggle()
      }
    }
  }) as HTMLButtonElement
  const buttonElement = createElement('span', {
    classes: ['textbus-toolbar-item', 'textbus-toolbar-dropdown-button-wrap'],
    attrs: {
      title: config.tooltip || ''
    },
    children: [
      leftButton,
      rightButton
    ]
  })
  const dropdown = createDropdown(buttonElement, config.menuView, config.stickyElement)
  let isSelfClick = false
  const unClick = fromEvent(document, 'mousedown').subscribe(() => {
    if (!isSelfClick) {
      dropdown.hide()
    }
    isSelfClick = false
  })
  let highlight = false
  let disabled = false
  return {
    elementRef: dropdown.elementRef,
    leftButton,
    destroy() {
      unClick.unsubscribe()
      dropdown.destroy()
    },
    hide() {
      dropdown.hide()
    },
    get highlight() {
      return highlight
    },
    set highlight(v: boolean) {
      highlight = v
      if (v) {
        leftButton.classList.add('textbus-toolbar-button-active')
      } else {
        leftButton.classList.remove('textbus-toolbar-button-active')
      }
    },
    get disabled() {
      return disabled
    },
    set disabled(v: boolean) {
      disabled = v
      leftButton.disabled = v
      rightButton.disabled = v
    }
  }
}
