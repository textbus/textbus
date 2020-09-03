import { Observable, Subject } from 'rxjs';

import { HighlightState } from '../help';
import { Tool } from './help';
import { Keymap, KeymapAction } from '../../viewer/input';
import { Commander } from '../../core/commander';
import { Matcher } from '../matcher/matcher';
import { UIButton, UIKit } from '../../uikit/uikit';

/**
 * 按扭型工具的配置接口
 */
export interface ButtonToolConfig {
  /** 按扭控件点击后调用的命令 */
  commanderFactory(): Commander;
  /** 锚中节点的的匹配项配置 */
  matcher?: Matcher;
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
  /** 是否支持源代码编辑模式 */
  supportSourceCodeModel?: boolean;
}

export class ButtonHandler implements Tool {
  readonly elementRef: HTMLButtonElement;
  onApply: Observable<void>;
  keymapAction: KeymapAction;
  commander: Commander;
  private eventSource = new Subject<void>();
  private btn: UIButton;

  constructor(private config: ButtonToolConfig) {
    this.commander = config.commanderFactory();
    this.onApply = this.eventSource.asObservable();

    this.btn = UIKit.button({
      ...config,
      onChecked: () => {
        this.eventSource.next();
      }
    })
    this.elementRef = this.btn.elementRef;
    if (config.keymap) {
      this.keymapAction = {
        keymap: config.keymap,
        action: () => {
          if (!this.btn.disabled) {
            this.eventSource.next();
          }
        }
      };
      this.elementRef.dataset.keymap = JSON.stringify(config.keymap);
    }
  }

  updateStatus(selectionMatchDelta: any): void {
    switch (selectionMatchDelta.state) {
      case HighlightState.Highlight:
        this.btn.highlight = true;
        break;
      case HighlightState.Normal:
        this.btn.disabled = false;
        this.btn.highlight = false;
        break;
      case HighlightState.Disabled:
        this.btn.disabled = true;
        break
    }
  }
}
