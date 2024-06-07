import { Injector } from '@tanbo/di'
import { Subscription } from '@tanbo/stream'
import { Controller, Keyboard, Keymap, QueryState, QueryStateType } from '@textbus/core'

import { Tool } from '../types'
import { createDropdown, UIDropdown } from './_utils/dropdown'
import { ViewController } from '../../uikit/types'

export interface DropdownToolConfig {
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

  viewController: ViewController<any>

  queryState(): QueryState<any>

  useValue(value: any): void

  onDestroy?(): void
}

export class DropdownTool implements Tool {
  private config!: DropdownToolConfig
  private viewer!: UIDropdown
  private controller!: Controller

  private subs: Subscription[] = []

  constructor(private factory: (injector: Injector) => DropdownToolConfig) {
  }

  setup(injector: Injector, limitElement: HTMLElement): HTMLElement {
    const config = this.factory(injector)
    this.config = config
    this.controller = injector.get(Controller)
    const keyboard = injector.get(Keyboard)
    const initValue: any = {}
    let prevValue: any = initValue

    this.subs.push(config.viewController.onComplete.subscribe(value => {
      prevValue = value
      form.hide()
      config.useValue(prevValue)
    }))
    const form = createDropdown({
      ...config,
      stickyElement: limitElement,
      menuView: config.viewController.elementRef
    })
    if (config.keymap) {
      keyboard.addShortcut({
        keymap: config.keymap,
        action() {
          if (!form.disabled && prevValue !== initValue) {
            config.useValue(prevValue)
          }
        }
      })
    }
    this.viewer = form
    return form.elementRef
  }

  refreshState() {
    const viewer = this.viewer

    if (this.controller.readonly) {
      viewer.disabled = true
      viewer.highlight = false
      return
    }
    const state = this.config.queryState()
    if (state.value) {
      this.config.viewController.update(state.value)
    } else {
      this.config.viewController.reset()
    }
    switch (state.state) {
      case QueryStateType.Enabled:
        viewer.disabled = false
        viewer.highlight = true
        break
      case QueryStateType.Normal:
        viewer.disabled = false
        viewer.highlight = false
        break
      case QueryStateType.Disabled:
        viewer.disabled = true
        viewer.highlight = false
        break
    }
  }

  disabled(is: boolean) {
    if (is) {
      this.viewer.disabled = true
      this.viewer.highlight = false
    }
  }

  onDestroy() {
    this.viewer.destroy()
    this.subs.forEach(i => i.unsubscribe())
    this.config.onDestroy?.()
  }
}
