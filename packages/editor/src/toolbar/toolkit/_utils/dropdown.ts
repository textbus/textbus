import { createElement, createTextNode } from '@textbus/browser'
import { Keymap } from '@textbus/core'
import { fromEvent } from '@tanbo/stream'

import { createDropdown as _createDropdown } from './_create-dropdown'

export interface UIDropdownConfig {
  /** 快捷键配置 */
  keymap?: Keymap;
  /** 给当前控件添加一组 css class */
  classes?: string[];
  /** 给当前控件添加一组 icon css class */
  iconClasses?: string[];
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: string;
  /** 设置控件显示的文字 */
  label?: string;

  menuView: HTMLElement,
  stickyElement: HTMLElement
}

export interface UIDropdown {
  elementRef: HTMLElement
  disabled: boolean
  highlight: boolean

  hide(): void

  destroy(): void
}

export function createDropdown(config: UIDropdownConfig): UIDropdown {
  const label = createElement('span', {
    classes: ['textbus-toolbar-dropdown-label'],
    children: [config.label ? createTextNode(config.label) : null]
  })
  let isSelfClick = false
  const button = createElement('button', {
    classes: ['textbus-toolbar-button'],
    attrs: {
      title: config.tooltip || '',
      type: 'button'
    },
    children: [
      config.iconClasses ? createElement('span', {
        classes: [...config.iconClasses]
      }) : null,
      label,
      createElement('span', {
        classes: ['textbus-dropdown-caret']
      })
    ],
    on: {
      click() {
        isSelfClick = true
        dropdown.toggle()
      }
    }
  }) as HTMLButtonElement

  const unClick = fromEvent(document, 'click').subscribe(() => {
    if (!isSelfClick) {
      dropdown.hide()
    }
    isSelfClick = false
  })
  const dropdownButton = createElement('span', {
    classes: ['textbus-toolbar-item', 'textbus-toolbar-dropdown'],
    children: [
      button
    ]
  })

  const dropdown = _createDropdown(dropdownButton, config.menuView, config.stickyElement)

  let highlight = false
  let disabled = false
  return {
    elementRef: dropdown.elementRef,
    hide() {
      dropdown.hide()
    },
    destroy() {
      dropdown.destroy()
      unClick.unsubscribe()
    },
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
