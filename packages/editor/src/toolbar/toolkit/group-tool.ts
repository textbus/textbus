import { createElement, createTextNode, Input, Keymap } from '@textbus/browser'
import { Injector } from '@tanbo/di'
import { QueryStateType } from '@textbus/core'
import { fromEvent } from '@tanbo/stream'

import { Tool } from '../types'
import { ButtonToolConfig } from './button-tool'
import { SelectOptionConfig, SelectToolConfig } from './select-tool'
import { DropdownToolConfig } from './dropdown-tool'
import { createDropdown, UIDropdown } from './_utils/dropdown'
import { createOption } from './_utils/_create-option'
import { DialogToolConfig } from './dialog-tool'
import { Dialog } from '../../dialog'
import { createKeymap } from './_utils/_create-keymap'

export enum ToolType {
  Select,
  Button,
  Dropdown,
  Dialog
}

export interface ButtonToolMenu extends ButtonToolConfig {
  type: ToolType.Button
}

export interface SelectToolMenu extends SelectToolConfig {
  type: ToolType.Select
  label: string
}

export interface DropdownMenu extends DropdownToolConfig {
  type: ToolType.Dropdown
}

export interface DialogMenu extends DialogToolConfig {
  type: ToolType.Dialog
}

export interface GroupToolConfig {
  /** 设置按扭显示的文字 */
  label?: string;
  /** 给按扭控件添加一组 css class 类 */
  classes?: string[];
  /** 给按扭控件添加一组 icon css class 类 */
  iconClasses?: string[];
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: string;
  items: Array<ButtonToolMenu | SelectToolMenu | DropdownMenu | DialogMenu>
}

interface GroupItemConfig {
  label: string
  keymap?: Keymap
  /** 给按扭控件添加一组 css class 类 */
  classes?: string[];
  /** 给按扭控件添加一组 icon css class 类 */
  iconClasses?: string[];
  isDropdown: boolean
}

interface ToolItem {
  elementRef: HTMLElement,

  refreshState(): void

  disabled(is: boolean): void
}

export class GroupTool implements Tool {
  private menus: ToolItem[] = []
  private config!: GroupToolConfig

  private controller!: UIDropdown

  constructor(private factory: (injector: Injector) => GroupToolConfig) {
  }

  setup(injector: Injector, limitElement: HTMLElement): HTMLElement {
    const config = this.factory(injector)
    const input = injector.get(Input)
    const dialog = injector.get(Dialog)
    this.config = config
    const menus = config.items.map(i => {
      switch (i.type) {
        case ToolType.Button:
          return this.createButton(i, input)
        case ToolType.Select:
          return this.createSelect(i, input)
        case ToolType.Dropdown:
          return this.createDropdown(i, input)
        case ToolType.Dialog:
          return this.createDialog(i, input, dialog)
      }
    }) as ToolItem[]
    this.menus = menus
    const groupItemGroup = createElement('div', {
      classes: ['textbus-toolbar-group-menu'],
      children: menus.map(i => i!.elementRef)
    })
    const dropdown = createDropdown({
      ...config,
      menuView: groupItemGroup,
      stickyElement: limitElement
    })
    this.controller = dropdown
    return dropdown.elementRef
  }

  refreshState() {
    this.menus.forEach(i => i.refreshState())
  }

  disabled() {
    //
  }

  private createDialog(config: DialogToolConfig, input: Input, dialog: Dialog) {
    const item = this._createItem({
      ...config,
      label: config.label || '',
      isDropdown: false
    })

    fromEvent(item.elementRef, 'click').subscribe(() => {
      dialog.show(config.viewController.elementRef)
      this.controller.hide()
    })

    const defaultValue: any = {}
    let prevValue = defaultValue

    config.viewController.onComplete.subscribe(value => {
      prevValue = value
      config.useValue(value)
      dialog.hide()
    })
    config.viewController.onCancel.subscribe(() => {
      dialog.hide()
    })
    if (config.keymap) {
      input.addShortcut({
        keymap: config.keymap,
        action() {
          if (!item.disabled && prevValue !== defaultValue) {
            config.useValue(prevValue)
          }
        }
      })
    }
    return {
      elementRef: item.elementRef,
      disabled(is: boolean) {
        item.disabled = is
      },
      refreshState() {
        if (!config.queryState) {
          return
        }
        const state = config.queryState()
        const viewer = item
        switch (state.state) {
          case QueryStateType.Disabled:
            viewer.disabled = true
            viewer.highlight = false
            config.viewController.reset()
            break
          case QueryStateType.Enabled:
            viewer.disabled = false
            viewer.highlight = true
            config.viewController.update(state.value)
            break
          case QueryStateType.Normal:
            viewer.disabled = false
            viewer.highlight = false
            config.viewController.reset()
        }
      }
    }
  }

  private createDropdown(config: DropdownToolConfig, input: Input) {
    const item = this._createItem({
      ...config,
      label: config.label || '',
      isDropdown: true
    })

    const menu = createElement('div', {
      classes: ['textbus-toolbar-submenu'],
      children: [
        config.viewController.elementRef
      ]
    })

    const defaultValue: any = {}

    let prevValue = defaultValue

    config.viewController.onComplete.subscribe(v => {
      prevValue = v
      config.useValue(v)
    })

    if (config.keymap) {
      input.addShortcut({
        keymap: config.keymap,
        action() {
          if (!item.disabled && prevValue !== defaultValue) {
            config.useValue(prevValue)
          }
        }
      })
    }

    item.elementRef.appendChild(menu)

    return {
      elementRef: item.elementRef,
      disabled(is: boolean) {
        item.disabled = is
      },
      refreshState() {
        if (!config.queryState) {
          return
        }
        const state = config.queryState()
        const viewer = item
        switch (state.state) {
          case QueryStateType.Disabled:
            viewer.disabled = true
            viewer.highlight = false
            config.viewController.reset()
            break
          case QueryStateType.Enabled:
            viewer.disabled = false
            viewer.highlight = true
            config.viewController.update(state.value)
            break
          case QueryStateType.Normal:
            viewer.disabled = false
            viewer.highlight = false
            config.viewController.reset()
        }
      }
    }
  }

  private createSelect(config: SelectToolMenu, input: Input): ToolItem {
    const item = this._createItem({
      ...config,
      isDropdown: true
    })

    const map = new Map<SelectOptionConfig, Element>()

    const menu = createElement('div', {
      classes: ['textbus-toolbar-submenu'],
      children: [
        createElement('div', {
          classes: ['textbus-toolbar-select-options'],
          children: config.options.map(option => {
            const el = createOption({
              ...option,
              onClick() {
                config.onChecked(option.value)
              }
            })
            map.set(option, el)
            if (option.keymap) {
              input.addShortcut({
                keymap: option.keymap,
                action() {
                  if (!item.disabled) {
                    config.onChecked(option.value)
                  }
                }
              })
            }
            return el
          })
        })
      ]
    })
    item.elementRef.appendChild(menu)

    return {
      elementRef: item.elementRef,
      disabled(is: boolean) {
        item.disabled = is
      },
      refreshState() {
        if (!config.queryState) {
          return
        }
        const state = config.queryState()
        const viewer = item
        switch (state.state) {
          case QueryStateType.Disabled:
            viewer.disabled = true
            viewer.highlight = false
            break
          case QueryStateType.Enabled:
            viewer.disabled = false
            viewer.highlight = true
            map.forEach((el, config) => {
              if (config.value === state.value) {
                el.classList.add('textbus-toolbar-option-active')
              } else {
                el.classList.remove('textbus-toolbar-option-active')
              }
            })
            break
          case QueryStateType.Normal:
            viewer.disabled = false
            viewer.highlight = false
        }
      }
    }
  }

  private createButton(config: ButtonToolMenu, input: Input): ToolItem {
    const item = this._createItem({
      ...config,
      label: config.label || '',
      isDropdown: false
    })

    fromEvent(item.elementRef, 'click').subscribe(() => {
      config.onClick()
    })

    if (config.keymap) {
      input.addShortcut({
        keymap: config.keymap,
        action() {
          if (!item.disabled) {
            config.onClick()
          }
        }
      })
    }

    return {
      elementRef: item.elementRef,
      disabled(is: boolean) {
        item.disabled = is
      },
      refreshState() {
        if (!config.queryState) {
          return
        }
        const state = config.queryState()
        const viewer = item
        switch (state.state) {
          case QueryStateType.Disabled:
            viewer.disabled = true
            viewer.highlight = false
            break
          case QueryStateType.Enabled:
            viewer.disabled = false
            viewer.highlight = true
            break
          case QueryStateType.Normal:
            viewer.disabled = false
            viewer.highlight = false
        }
      }
    }
  }

  private _createItem(config: GroupItemConfig) {
    const button = createElement('button', {
      attrs: {
        type: 'button'
      },
      classes: ['textbus-toolbar-group-button'],
      children: [
        config.iconClasses ? createElement('span', {
          classes: [...config.iconClasses, 'textbus-toolbar-group-button-icon']
        }) : null,
        createElement('span', {
          classes: ['textbus-toolbar-group-button-label'],
          children: [
            createTextNode(config.label)
          ]
        }),
        config.keymap ? createElement('span', {
          classes: ['textbus-toolbar-group-button-keymap'],
          children: createKeymap(config.keymap)
        }) : null,
        config.isDropdown ? createElement('span', {
          classes: ['textbus-toolbar-group-button-caret']
        }) : null
      ]
    }) as HTMLButtonElement
    const wrapper = createElement('div', {
      classes: ['textbus-toolbar-group-item'],
      children: [
        button
      ]
    })

    let highlight = false
    let disabled = false

    return {
      elementRef: wrapper,
      get highlight() {
        return highlight
      },
      set highlight(v: boolean) {
        highlight = v
        if (v) {
          button.classList.add('textbus-toolbar-group-button-active')
        } else {
          button.classList.remove('textbus-toolbar-group-button-active')
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
}
