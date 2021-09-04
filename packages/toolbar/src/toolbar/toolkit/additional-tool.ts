import { fromEvent, Observable, Subscription } from 'rxjs';
import { I18n, I18nString, createElement, Keymap } from '@textbus/core';

import { UIKit } from '../_utils/uikit';
import { Tool, ToolFactoryParams, HighlightState, ToolFactory } from '../help';
import { Commander } from '../commander';
import { Matcher, SelectionMatchState } from '../matcher/matcher';

export interface AdditionalViewer {
  elementRef: HTMLElement;
  onAction: Observable<any>;
  onDestroy: Observable<void>;

  destroy(): void;
}

/**
 * 附加视图工具的配置接口
 */
export interface AdditionalToolConfig {
  /** 按扭控件点击后调用的命令 */
  commanderFactory(): Commander;

  /** 下拉控件展开后显示的内容 */
  viewFactory(i18n: I18n): AdditionalViewer;

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

export class AdditionalTool implements ToolFactory {
  private subs: Subscription[] = [];

  constructor(private config: AdditionalToolConfig) {
  }

  create(params: ToolFactoryParams, addTool: (tool: Tool) => void): HTMLElement {
    const {i18n, limitElement} = params;
    const config = {
      ...this.config,
      label: typeof this.config.label === 'function' ? this.config.label(i18n) : this.config.label,
      tooltip: typeof this.config.tooltip === 'function' ? this.config.tooltip(i18n) : this.config.tooltip
    }
    let contentWrapper: HTMLElement;
    let closeBtn: HTMLButtonElement;
    const elementRef = createElement('div', {
      classes: ['textbus-toolbar-additional-worktable'],
      children: [
        contentWrapper = createElement('div', {
          classes: ['textbus-toolbar-additional-worktable-content']
        }),
        createElement('div', {
          classes: ['textbus-toolbar-additional-worktable-close'],
          children: [
            closeBtn = createElement('button', {
              attrs: {
                type: 'button'
              },
              props: {
                innerHTML: '&times;'
              }
            }) as HTMLButtonElement
          ]
        })
      ]
    })

    const content = config.viewFactory(i18n);
    this.subs.push(
      fromEvent(closeBtn, 'click').subscribe(() => {
        button.disabled = false;
        button.highlight = false;
        content.destroy();
        limitElement.removeChild(elementRef);
      })
    )

    const button = UIKit.button({
      label: config.label,
      classes: config.classes,
      tooltip: config.tooltip,
      iconClasses: config.iconClasses,
      onChecked() {
        button.highlight = true;
        contentWrapper.appendChild(content.elementRef);
        limitElement.appendChild(elementRef);
      }
    });
    addTool({
      onAction: content.onAction,
      keymaps: config.keymap ? [{
        keymap: config.keymap,
        action() {
          if (!button.disabled) {
            button.highlight = true;
            contentWrapper.appendChild(content.elementRef);
            limitElement.appendChild(elementRef);
          }
        }
      }] : [],
      commander: config.commanderFactory(),
      matcher: config.matcher,
      refreshState(selectionMatchState: SelectionMatchState) {
        switch (selectionMatchState.state) {
          case HighlightState.Highlight:
            button.disabled = false;
            button.highlight = true;
            break;
          case HighlightState.Normal:
            button.disabled = false;
            button.highlight = false;
            break;
          case HighlightState.Disabled:
            button.disabled = true;
            button.highlight = false;
            break;
        }
      }
    })
    return button.elementRef;
  }

  onDestroy() {
    this.subs.forEach(i => i.unsubscribe())
  }
}
