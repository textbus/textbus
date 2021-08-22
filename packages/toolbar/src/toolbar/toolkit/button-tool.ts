import { Subject } from 'rxjs';
import { I18nString , Keymap } from '@textbus/core';

import { UIKit } from '../_utils/uikit';
import { HighlightState, Tool, ToolFactory, ToolFactoryParams } from '../help';
import { Commander } from '../commander';
import { Matcher, SelectionMatchState } from '../matcher/matcher';

/**
 * 按扭型工具的配置接口
 */
export interface ButtonToolConfig {
  /** 按扭控件点击后调用的命令 */
  commanderFactory(): Commander;

  /** 状态查询器 */
  matcher?: Matcher;
  /** 设置按扭显示的文字 */
  label?: I18nString;
  /** 给按扭控件添加一组 css class 类 */
  classes?: string[];
  /** 给按扭控件添加一组 icon css class 类 */
  iconClasses?: string[];
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: I18nString;
  /** 当前按扭控件的快捷键配置 */
  keymap?: Keymap;
}

export class ButtonTool implements ToolFactory {
  constructor(private config: ButtonToolConfig) {
  }

  create(params: ToolFactoryParams, addTool: (tool: Tool) => void): HTMLElement {
    const {i18n} = params;
    const config = {
      ...this.config,
      label: typeof this.config.label === 'function' ? this.config.label(i18n) : this.config.label,
      tooltip: typeof this.config.tooltip === 'function' ? this.config.tooltip(i18n) : this.config.tooltip
    }
    const subject = new Subject();
    const obs = subject.asObservable();
    const btn = UIKit.button({
      ...config,
      onChecked: () => {
        subject.next()
      }
    })
    btn.elementRef.dataset.keymap = JSON.stringify(config.keymap);
    addTool({
      commander: config.commanderFactory(),
      keymaps: config.keymap ? [{
        keymap: config.keymap,
        action() {
          if (!btn.disabled) {
            subject.next();
          }
        }
      }] : [],
      onAction: obs,
      matcher: config.matcher,
      refreshState(selectionMatchState: SelectionMatchState) {
        switch (selectionMatchState.state) {
          case HighlightState.Highlight:
            btn.highlight = true;
            break;
          case HighlightState.Normal:
            btn.disabled = false;
            btn.highlight = false;
            break;
          case HighlightState.Disabled:
            btn.disabled = true;
            break
        }
      }
    })
    return btn.elementRef;
  }
}
