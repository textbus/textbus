import { Subject } from 'rxjs';
import { I18nString, Keymap, FormatData, AbstractComponent } from '@textbus/core';

import { UIKit } from '../_utils/uikit';
import { Tool, ToolFactory, ToolFactoryParams, HighlightState } from '../help';
import { Commander } from '../commander';
import { Matcher, SelectionMatchState } from '../matcher/_api';

/**
 * Select 工具选项配置项
 */
export interface SelectOptionConfig {
  /** 当前选项被选中后，要应用的值 */
  value: any;
  /** 当前选项显示的文字，如为空则显示 value */
  label?: I18nString;
  /** 给当前选项添加一组 css class 类 */
  classes?: string[];
  /** 给当前选项添加 icon css class 类 */
  iconClasses?: string[];
  /** 当所有选项都未锚中时，显示的默认项 */
  default?: boolean;
  /** 当前选项应用的快捷键 */
  keymap?: Keymap;
}

/**
 * 下拉选择工具配置项
 */
export interface SelectToolConfig {
  /** 当前 Select 某项点击后，应用的命令 */
  commanderFactory(): Commander;

  /** Select 的可选项配置 */
  options: SelectOptionConfig[];

  /** 根据当前匹配的抽象数据，返回要高亮的选项 */
  matchOption?<T = FormatData | AbstractComponent>(data: T): SelectOptionConfig;

  /** 状态查询器 */
  matcher?: Matcher;
  /** 给 Select 控件添加一组 css class */
  classes?: string[];
  /** 给 select 控件添加一组 icon css class 类 */
  iconClasses?: string[];
  /** 设置当前 Select 是否根据内容扩展宽度 */
  mini?: boolean;
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: I18nString;
}

export class SelectTool implements ToolFactory {
  constructor(private config: SelectToolConfig) {
  }

  create(params: ToolFactoryParams, addTool: (tool: Tool) => void): HTMLElement {
    const {i18n, limitElement} = params;
    const map = new Map<SelectOptionConfig, SelectOptionConfig>();
    const config = {
      ...this.config,
      tooltip: typeof this.config.tooltip === 'function' ? this.config.tooltip(i18n) : this.config.tooltip,
      options: this.config.options.map(option => {
        const o = {
          ...option,
          label: typeof option.label === 'function' ? option.label(i18n) : option.label
        }
        map.set(option, o);
        return o;
      })
    }
    const subject = new Subject();
    const obs = subject.asObservable();
    const dropdown = UIKit.select({
      ...config,
      stickyElement: limitElement,
      onSelected: (value: any) => {
        subject.next(value);
      }
    })
    addTool({
      commander: config.commanderFactory(),
      onAction: obs,
      keymaps: config.options.filter(i => i.keymap).map(i => {
        return {
          keymap: i.keymap,
          action() {
            if (!dropdown.disabled) {
              subject.next(i.value);
            }
          }
        }
      }),
      matcher: config.matcher,
      refreshState(selectionMatchState: SelectionMatchState): void {
        if (selectionMatchState.matchData) {
          const option = config.matchOption?.(selectionMatchState.matchData);
          if (option) {
            const o = map.get(option);
            dropdown.button.label.innerText = o.label || o.value;
            dropdown.disabled = false;
            dropdown.highlight = true;
            return;
          }
        }
        dropdown.highlight = false;
        dropdown.disabled = selectionMatchState.state === HighlightState.Disabled;
        let defaultOption: SelectOptionConfig;
        for (const op of config.options) {
          if (op.default) {
            defaultOption = op;
            break;
          }
        }
        if (defaultOption) {
          dropdown.button.label.innerText = defaultOption.label || defaultOption.value;
        }
      }
    })
    return dropdown.elementRef;
  }
}
