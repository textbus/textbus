import { Injector } from '@tanbo/di'
import { Keyboard, Keymap, QueryState, QueryStateType } from '@textbus/core'

import { Tool } from '../types'
import { createSelect, UISelect } from './_utils/_api'

/**
 * Select 工具选项配置项
 */
export interface SelectOptionConfig<T = any> {
  /** 当前选项被选中后，要应用的值 */
  value: T;
  /** 当前选项显示的文字，如为空则显示 value */
  label: string;
  /** 给当前选项添加一组 css class 类 */
  classes?: string[];
  /** 给当前选项添加 icon css class 类 */
  iconClasses?: string[];
  /** 当所有选项都未锚中时，显示的默认项 */
  default?: boolean;
  /** 当前选项应用的快捷键 */
  keymap?: Keymap;
  /** 是否禁用 */
  disabled?: boolean
}

/**
 * 下拉选择工具配置项
 */
export interface SelectToolConfig<T = any> {
  /** Select 的可选项配置 */
  options: SelectOptionConfig<T>[];

  /** 给 Select 控件添加一组 css class */
  classes?: string[];
  /** 给 select 控件添加一组 icon css class 类 */
  iconClasses?: string[];
  /** 设置当前 Select 是否根据内容扩展宽度 */
  mini?: boolean;
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: string;

  onChecked(value: T): void

  queryState?(): QueryState<T>

  onDestroy?(): void
}

export class SelectTool implements Tool {
  private config!: SelectToolConfig
  private viewer!: UISelect

  constructor(private factory: (injector: Injector) => SelectToolConfig) {
  }

  setup(injector: Injector, limitElement: HTMLElement): HTMLElement {
    const config = this.factory(injector)
    this.config = config
    const keyboard = injector.get(Keyboard)
    const dropdown = createSelect({
      ...config,
      stickyElement: limitElement,
      onSelected: (value: any) => {
        config.onChecked(value)
      }
    })
    config.options.filter(i => i.keymap).forEach(i => {
      keyboard.addShortcut({
        keymap: i.keymap!,
        action: () => {
          if (!dropdown.disabled) {
            this.config.onChecked(i.value)
          }
        }
      })
    })
    this.viewer = dropdown
    return dropdown.elementRef
  }

  refreshState() {
    if (!this.config.queryState) {
      return
    }
    const state = this.config.queryState()
    const dropdown = this.viewer
    if (state.value) {
      const option = this.config.options.find(i => {
        return i.value === state.value
      })
      if (option) {
        dropdown.setLabel(option.label)
        dropdown.disabled = false
        dropdown.highlight = true
        return
      }
    }
    dropdown.highlight = false
    dropdown.disabled = state.state === QueryStateType.Disabled
    let defaultOption!: SelectOptionConfig
    for (const op of this.config.options) {
      if (op.default) {
        defaultOption = op
        break
      }
    }
    if (defaultOption) {
      dropdown.setLabel(defaultOption.label)
    }
  }

  disabled(is: boolean) {
    if (is) {
      this.viewer.disabled = true
      this.viewer.highlight = false
    }
  }

  onDestroy() {
    this.config.onDestroy?.()
  }
}
