import { merge, Observable, Subject, Subscription } from 'rxjs';
import { I18n, I18nString, Keymap } from '@textbus/core';

import { Tool, ToolFactory, ToolFactoryParams } from '../help';
import { UIKit } from '../_utils/uikit';
import { HighlightState } from '../help';
import { Matcher, SelectionMatchState } from '../matcher/_api';
import { Commander } from '../commander';

export interface DropdownViewer<T = any> {
  elementRef: HTMLElement;
  onComplete: Observable<T>;
  onClose?: Observable<void>;

  update?(value?: any): void;

  reset?(): void;
}

export interface DropdownToolConfig<T = any> {
  /** 下拉控件展开后显示的内容 */
  viewFactory(i18n: I18n): DropdownViewer<T>;

  /** 状态查询器 */
  matcher?: Matcher;

  /** 订阅下拉控件操作完成时调用的命令 */
  commanderFactory(): Commander;

  /** 快捷键配置 */
  keymap?: Keymap;

  /** 给当前控件添加一组 css class */
  classes?: string[];
  /** 给当前控件添加一组 icon css class */
  iconClasses?: string[];
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: I18nString;
  /** 设置控件显示的文字 */
  label?: I18nString;
}

export class DropdownTool<T = any> implements ToolFactory<T> {
  private subs: Subscription[] = [];

  constructor(private config: DropdownToolConfig<T>) {
  }

  create(params: ToolFactoryParams, addTool: (tool: Tool<T>) => void): HTMLElement {
    const {i18n, limitElement} = params;
    const config = {
      ...this.config,
      label: typeof this.config.label === 'function' ? this.config.label(i18n) : this.config.label,
      tooltip: typeof this.config.tooltip === 'function' ? this.config.tooltip(i18n) : this.config.tooltip
    };
    const viewer = config.viewFactory(i18n);
    const dropdown = UIKit.dropdown({
      button: {
        ...config
      },
      menu: viewer.elementRef,
      stickyElement: limitElement
    })
    let prevValue: T = null;
    this.subs.push(viewer.onComplete.subscribe(value => {
      prevValue = value;
      dropdown.hide();
    }))
    dropdown.button.elementRef.dataset.keymap = JSON.stringify(config.keymap);
    const subject = new Subject<T>();
    const obs = subject.asObservable();
    addTool({
      keymaps: config.keymap ? [{
        keymap: config.keymap,
        action() {
          if (!dropdown.disabled) {
            subject.next(prevValue);
          }
        }
      }] : [],
      onAction: merge(viewer.onComplete, obs),
      commander: config.commanderFactory(),
      matcher: config.matcher,
      refreshState(selectionMatchState: SelectionMatchState): void {
        viewer.update(selectionMatchState.matchData);
        switch (selectionMatchState.state) {
          case HighlightState.Highlight:
            dropdown.disabled = false;
            dropdown.highlight = true;
            break;
          case HighlightState.Normal:
            dropdown.disabled = false;
            dropdown.highlight = false;
            break;
          case HighlightState.Disabled:
            dropdown.disabled = true;
            dropdown.highlight = false;
            break
        }
      }
    })
    return dropdown.elementRef;
  }

  onDestroy() {
    this.subs.filter(i => i.unsubscribe())
  }
}
