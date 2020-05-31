import { Observable, Subject } from 'rxjs';

import { HighlightState } from '../help';
import { Tool } from './help';
import { Keymap, KeymapAction } from '../../viewer/_api';
import { Commander } from '../../core/commander';
import { Matcher } from '../matcher/matcher';
import { ContextMenuConfig } from './help';

/**
 * 按扭型工具的配置接口
 */
export interface ButtonConfig {
  /** 按扭控件点击后调用的命令 */
  execCommand: Commander;
  /** 设置上下文菜单 */
  contextMenu?: ContextMenuConfig[];
  /** 锚中节点的的匹配项配置 */
  match?: Matcher;
  /** 设置按扭显示的文字 */
  label?: string;
  /** 给按扭控件添加一组 css class 类 */
  classes?: string[];
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: string;
  /** 当前按扭控件的快捷键配置 */
  keymap?: Keymap;
}

export class ButtonHandler implements Tool {
  readonly elementRef = document.createElement('button');
  onApply: Observable<void>;
  keymapAction: KeymapAction;
  private eventSource = new Subject<void>();

  constructor(private config: ButtonConfig) {
    this.onApply = this.eventSource.asObservable();
    this.elementRef.type = 'button';
    this.elementRef.title = config.tooltip || '';
    this.elementRef.classList.add('tbus-handler');
    const inner = document.createElement('span');
    inner.innerText = config.label || '';
    inner.classList.add(...(config.classes || []));
    this.elementRef.appendChild(inner);
    if (config.keymap) {
      this.keymapAction = {
        keymap: config.keymap,
        action: () => {
          if (!this.elementRef.disabled) {
            this.eventSource.next();
          }
        }
      };
      this.elementRef.dataset.keymap = JSON.stringify(config.keymap);
    }
    this.elementRef.addEventListener('click', () => {
      this.eventSource.next();
    });
  }

  updateStatus(selectionMatchDelta: any): void {
    switch (selectionMatchDelta.state) {
      case HighlightState.Highlight:
        this.elementRef.disabled = false;
        this.elementRef.classList.add('tbus-handler-active');
        break;
      case HighlightState.Normal:
        this.elementRef.disabled = false;
        this.elementRef.classList.remove('tbus-handler-active');
        break;
      case HighlightState.Disabled:
        this.elementRef.classList.remove('tbus-handler-active');
        this.elementRef.disabled = true;
        break
    }
  }
}
