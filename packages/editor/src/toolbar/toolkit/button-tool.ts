import { Injector } from '@tanbo/di'
import { QueryState, QueryStateType, Keymap, Keyboard } from '@textbus/core'

import { createButton, UIButton } from './_utils/_api'
import { Tool } from '../types'

export interface ButtonToolConfig<T = any> {
  /** 设置按扭显示的文字 */
  label?: string;
  /** 给按扭控件添加一组 css class 类 */
  classes?: string[];
  /** 给按扭控件添加一组 icon css class 类 */
  iconClasses?: string[];
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: string;
  /** 当前按扭控件的快捷键配置 */
  keymap?: Keymap;

  onClick(): void

  queryState?(): QueryState<T>

  onDestroy?(): void
}

export class ButtonTool implements Tool {
  private viewer!: UIButton
  private config!: ButtonToolConfig<any>

  constructor(private factory: (injector: Injector) => ButtonToolConfig<any>) {
  }

  setup(injector: Injector): HTMLElement {
    this.config = this.factory(injector)
    const keyboard = injector.get(Keyboard)
    const viewer = createButton({
      ...this.config,
      onClick: () => {
        this.config.onClick()
      }
    })
    if (this.config.keymap) {
      keyboard.addShortcut({
        keymap: this.config.keymap,
        action: () => {
          this.config.onClick()
        }
      })
    }
    this.viewer = viewer
    return viewer.elementRef
  }

  refreshState() {
    if (!this.config.queryState) {
      return
    }
    const state = this.config.queryState()
    const viewer = this.viewer
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
