import { Subscription } from '@tanbo/stream'
import { Injector } from '@tanbo/di'
import { Keymap, QueryState, QueryStateType } from '@textbus/core'
import { Input } from '@textbus/browser'

import { UISegmentDropdown } from './_utils/_api'
import { Tool } from '../types'
import { createSegmentDropdown } from './_utils/segment-dropdown'
import { ViewController } from '../../uikit/types'

export interface SegmentDropdownToolConfig<T = any> {

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

  viewController: ViewController<T>

  onInit?(ui: UISegmentDropdown): void

  useValue?(value: T): void

  queryState?(): QueryState<T>

  onDestroy?(): void
}

export class SegmentDropdownTool implements Tool {
  private subs: Subscription[] = []
  private config!: SegmentDropdownToolConfig
  private viewer!: UISegmentDropdown

  constructor(private factory: (injector: Injector) => SegmentDropdownToolConfig) {
  }

  setup(injector: Injector, limitElement: HTMLElement): HTMLElement {
    const config = this.factory(injector)
    this.config = config
    const input = injector.get(Input)

    const view = config.viewController.elementRef
    const dropdown = createSegmentDropdown({
      ...config,
      menuView: view,
      stickyElement: limitElement,
      onLeftButtonClick() {
        if (!dropdown.disabled && prevValue !== initValue) {
          config.useValue?.(prevValue)
        }
      }
    })
    const initValue = {}
    let prevValue: any = initValue
    this.subs.push(config.viewController.onComplete.subscribe(value => {
      prevValue = value
      config.useValue?.(value)
      dropdown.hide()
    }))
    // dropdown.button.elementRef.dataset.keymap = JSON.stringify(config.keymap)

    if (config.keymap) {
      input.addShortcut({
        keymap: config.keymap,
        action() {
          if (!dropdown.disabled && prevValue !== initValue) {
            config.useValue?.(prevValue)
          }
        }
      })
    }
    this.viewer = dropdown
    config.onInit?.(dropdown)
    return dropdown.elementRef
  }

  disabled(is: boolean) {
    if (is) {
      this.viewer.disabled = true
      this.viewer.highlight = false
    }
  }

  refreshState() {
    if (!this.config.queryState) {
      return
    }
    const viewer = this.viewer
    const state = this.config.queryState()
    this.config.viewController.update(state.value)
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

  onDestroy() {
    this.subs.forEach(i => i.unsubscribe())
    this.config.onDestroy?.()
  }
}
