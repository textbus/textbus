import { createElement, Keymap } from '@textbus/browser'
import { createDropdown } from './_create-dropdown'
import { createOption } from './_create-option'
import { fromEvent } from '@tanbo/stream'

export interface UISelectConfig {
  stickyElement: HTMLElement
  options: UISelectOption[];
  classes?: string[];
  iconClasses?: string[];
  tooltip?: string;
  mini?: boolean;

  onSelected(value: any): any;
}

export interface UISelectOption {
  value: any;
  label: string;
  classes?: string[];
  iconClasses?: string[];
  default?: boolean;
  keymap?: Keymap;
}

export interface UISelect {
  elementRef: HTMLElement
  disabled: boolean
  highlight: boolean

  setLabel(text: string): void

  destroy(): void
}

export function createSelect(config: UISelectConfig): UISelect {
  const label = createElement('span', {
    classes: ['textbus-toolbar-select-label'].concat(config.mini ? ['textbus-toolbar-select-label-mini']: [])
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
        classes: [...config.iconClasses, 'textbus-toolbar-select-icon']
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

  const menu = createElement('div', {
    classes: ['textbus-toolbar-select-options'],
    children: config.options.map(option => {
      if (option.default) {
        label.innerText = option.label
      }
      return createOption({
        ...option,
        onClick() {
          dropdown.hide()
          config.onSelected(option.value)
        }
      })
    })
  })
  const dropdown = createDropdown(dropdownButton, menu, config.stickyElement)

  let highlight = false
  let disabled = false
  return {
    elementRef: dropdown.elementRef,
    destroy() {
      dropdown.destroy()
      unClick.unsubscribe()
    },
    setLabel(text: string) {
      label.innerText = text
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
