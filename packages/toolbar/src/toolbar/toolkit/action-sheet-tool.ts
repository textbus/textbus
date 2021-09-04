import { Subject } from 'rxjs';
import { I18nString, Keymap } from '@textbus/core';

import { UIKit } from '../_utils/uikit';
import { HighlightState, Tool, ToolFactoryParams } from '../help';
import { ToolFactory } from '../help';
import { Commander } from '../commander';
import { Matcher, SelectionMatchState } from '../matcher/_api';

export interface ActionConfig {
  /** 设置当前 action 的 value */
  value?: any;
  /** 设置当前 action 显示的文字 */
  label?: I18nString;
  /** 给当前 action 添加一组 css class */
  classes?: string[];
  /** 给当前 action 添加一组 icon css class */
  iconClasses?: string[];
  /** 给当前 action 添加一组 css class */
  keymap?: Keymap;
}

/**
 * 动作表工具配置
 */
export interface ActionSheetToolConfig {
  /** 当前控件可操作的选项 */
  actions: ActionConfig[];

  /** 当某一项被点击时调用的命令 */
  commanderFactory(): Commander;

  /** 状态查询器 */
  matcher?: Matcher;
  /** 设置控件显示的文字 */
  label?: I18nString;
  /** 给当前控件添加一组 css class */
  classes?: string[];
  /** 给控件添加一组 icon css class 类 */
  iconClasses?: string[];
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: I18nString;
}

export class ActionSheetTool implements ToolFactory {
  constructor(private config: ActionSheetToolConfig) {
  }

  create(params: ToolFactoryParams, addTool: (tool: Tool) => void): HTMLElement {
    const {i18n, limitElement} = params;
    const config = {
      ...this.config,
      label: typeof this.config.label === 'function' ? this.config.label(i18n) : this.config.label,
      tooltip: typeof this.config.tooltip === 'function' ? this.config.tooltip(i18n) : this.config.tooltip,
      actions: this.config.actions.map(action => {
        return {
          ...action,
          label: typeof action.label === 'function' ? action.label(i18n) : action.label
        }
      })
    }

    const subject = new Subject<any>();
    const obs = subject.asObservable();
    const viewer = UIKit.actions({
      ...config,
      stickyElement: limitElement,
      items: config.actions.map(v => {
        return {
          ...v,
          onChecked() {
            subject.next(v.value);
          }
        }
      })
    })
    addTool({
      commander: config.commanderFactory(),
      matcher: config.matcher,
      keymaps: config.actions.filter(i => i.keymap).map(action => {
        return {
          keymap: action.keymap,
          action() {
            if (!viewer.disabled) {
              subject.next(action.value)
            }
          }
        }
      }),
      onAction: obs,
      refreshState(selectionMatchState: SelectionMatchState): void {
        switch (selectionMatchState.state) {
          case HighlightState.Highlight:
            viewer.disabled = false;
            viewer.highlight = true;
            break;
          case HighlightState.Normal:
            viewer.disabled = false;
            viewer.highlight = false;
            break;
          case HighlightState.Disabled:
            viewer.disabled = true;
            viewer.highlight = false;
            break
        }
      }
    });
    return viewer.elementRef
  }
}
