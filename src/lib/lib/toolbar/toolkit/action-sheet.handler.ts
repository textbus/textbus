import { Observable, Subject } from 'rxjs';

import { HighlightState } from '../help';
import { Tool, ContextMenuConfig } from './help';
import { Keymap, KeymapAction } from '../../viewer/input';
import { Commander } from '../../core/_api';
import { Matcher } from '../matcher/_api';
import { UIDropdown, UIKit } from '../../uikit/uikit';

export interface ActionConfig {
  /** 设置当前 action 的 value */
  value?: any;
  /** 设置当前 action 显示的文字 */
  label?: string;
  /** 给当前 action 添加一组 css class */
  classes?: string[];
  /** 给当前 action 添加一组 css class */
  keymap?: Keymap;
}

export interface ActionSheetConfig {
  /** 当前控件可操作的选项 */
  actions: ActionConfig[];

  /** 当某一项被点击时调用的命令 */
  commanderFactory(): Commander;

  /** 设置上下文菜单 */
  contextMenu?: ContextMenuConfig[];
  /** 锚中节点的的匹配项配置 */
  matcher?: Matcher;
  /** 设置控件显示的文字 */
  label?: string;
  /** 给当前控件添加一组 css class */
  classes?: string[];
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: string;
  /** 是否支持源代码编辑模式 */
  supportSourceCodeModel?: boolean;
}

export class ActionSheetHandler implements Tool {
  readonly elementRef: HTMLElement;
  onMatched: Observable<ActionConfig>;
  onApply: Observable<any>;
  keymapAction: KeymapAction[] = [];
  commander: Commander;

  private matchedEvent = new Subject<ActionConfig>();
  private eventSource = new Subject<any>();
  private dropdown: UIDropdown;

  constructor(private config: ActionSheetConfig,
              private stickyElement: HTMLElement) {
    this.onApply = this.eventSource.asObservable();
    this.onMatched = this.matchedEvent.asObservable();

    this.dropdown = UIKit.actions({
      label: config.label,
      classes: config.classes,
      stickyElement,
      items: config.actions.map(v => {
        return {
          ...v,
          onChecked() {
            this.eventSource.next(v.value);
          }
        }
      })
    })

    this.commander = config.commanderFactory();

    config.actions.forEach(action => {
      if (action.keymap) {
        this.keymapAction.push({
          keymap: action.keymap,
          action: () => {
            if (!this.dropdown.disabled) {
              this.eventSource.next(action.value);
            }
          }
        })
      }
    })
    this.elementRef = this.dropdown.dropdown;
  }

  updateStatus(selectionMatchDelta: any): void {
    switch (selectionMatchDelta.state) {
      case HighlightState.Highlight:
        this.dropdown.disabled = false;
        this.dropdown.highlight = true;
        break;
      case HighlightState.Normal:
        this.dropdown.disabled = false;
        this.dropdown.highlight = false;
        break;
      case HighlightState.Disabled:
        this.dropdown.disabled = true;
        this.dropdown.highlight = false;
        break
    }
  }
}
