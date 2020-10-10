import { Observable, Subject } from 'rxjs';

import { Tool } from './help';
import { HighlightState } from '../help';
import { Keymap, KeymapAction } from '../../viewer/input';
import { Matcher, SelectionMatchState } from '../matcher/_api';
import { Commander, FormatAbstractData, Component } from '../../core/_api';
import { UIDropdown, UIKit } from '../../uikit/uikit';

/**
 * Select 工具选项配置项
 */
export interface SelectOptionConfig {
  /** 当前选项被选中后，要应用的值 */
  value: any;
  /** 当前选项显示的文字，如为空则显示 value */
  label?: string;
  /** 给当前选项添加一组 css class 类 */
  classes?: string[];
  /** 给当前选项添加 icon css class 类 */
  iconClasses?: string[];
  /** 当所有选项都未锚中时，显示的默认项 */
  default?: boolean;
  /** 当前选项应用的快捷键 */
  keymap?: Keymap;
}

export interface SelectToolConfig {
  /** 当前 Select 某项点击后，应用的命令 */
  commanderFactory(): Commander;

  /** Select 的可选项配置 */
  options: SelectOptionConfig[];

  /** 根据当前匹配的抽象数据，返回要高亮的选项 */
  highlight?<T = FormatAbstractData | Component>(options: SelectOptionConfig[], data: T): SelectOptionConfig;

  /** 锚中节点的的匹配项配置 */
  matcher?: Matcher;
  /** 给 Select 控件添加一组 css class */
  classes?: string[];
  /** 给 select 控件添加一组 icon css class 类 */
  iconClasses?: string[];
  /** 设置当前 Select 是否根据内容扩展宽度 */
  mini?: boolean;
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: string;
  /** 是否支持源代码编辑模式 */
  supportSourceCodeMode?: boolean;
}

export class SelectHandler implements Tool {
  readonly elementRef: HTMLElement;
  onApply: Observable<any>;
  keymapAction: KeymapAction[] = [];
  commander: Commander;
  private applyEventSource = new Subject<any>();
  private value = '';
  private dropdown: UIDropdown;

  constructor(private config: SelectToolConfig,
              private stickyElement: HTMLElement) {
    this.commander = config.commanderFactory();
    this.onApply = this.applyEventSource.asObservable();

    this.dropdown = UIKit.select({
      ...config,
      stickyElement,
      onSelected: (value: any) => {
        this.value = value;
        this.applyEventSource.next(value);
      }
    })

    this.config.options.forEach(option => {
      if (option.keymap) {
        this.keymapAction.push({
          keymap: option.keymap,
          action: () => {
            if (!this.dropdown.disabled) {
              this.value = option.value;
              this.applyEventSource.next(option.value);
            }
          }
        })
      }
    })
    this.elementRef = this.dropdown.elementRef;
  }

  updateStatus(selectionMatchState: SelectionMatchState): void {
    if (selectionMatchState.matchData) {
      const option = this.config.highlight?.(this.config.options, selectionMatchState.matchData);
      if (option) {
        this.dropdown.button.label.innerText = option.label || option.value;
        this.dropdown.disabled = false;
        this.dropdown.highlight = true;
        return;
      }
    }
    this.dropdown.highlight = false;
    this.dropdown.disabled = selectionMatchState.state === HighlightState.Disabled;
    let defaultOption: SelectOptionConfig;
    for (const op of this.config.options) {
      if (op.default) {
        defaultOption = op;
        break;
      }
    }
    if (defaultOption) {
      this.dropdown.button.label.innerText = defaultOption.label || defaultOption.value;
    }
  }
}
