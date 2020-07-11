import { Observable, Subject } from 'rxjs';

import { createKeymapHTML, Tool, ContextMenuConfig } from './help';
import { Dropdown, DropdownViewer } from './utils/dropdown';
import { HighlightState } from '../help';
import { Keymap, KeymapAction } from '../../viewer/input';
import { Matcher, SelectionMatchDelta } from '../matcher/_api';
import { Commander, FormatAbstractData, LeafTemplate, BackboneTemplate } from '../../core/_api';

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
  /** 当所有选项都未锚中时，显示的默认项 */
  default?: boolean;
  /** 当前选项应用的快捷键 */
  keymap?: Keymap;
}

export interface SelectConfig {
  /** 当前 Select 某项点击后，应用的命令 */
  commanderFactory(): Commander;

  /** Select 的可选项配置 */
  options: SelectOptionConfig[];

  /** 根据当前匹配的抽象数据，返回要高亮的选项 */
  highlight<T = FormatAbstractData | BackboneTemplate | LeafTemplate>(options: SelectOptionConfig[], data: T): SelectOptionConfig;

  /** 设置上下文菜单 */
  contextMenu?: ContextMenuConfig[];

  /** 锚中节点的的匹配项配置 */
  matcher?: Matcher;
  /** 给 Select 控件添加一组 css class */
  classes?: string[];
  /** 设置当前 Select 是否根据内容扩展宽度 */
  mini?: boolean;
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: string;
}

class SelectOptionHandler {
  readonly elementRef = document.createElement('button');
  onCheck: Observable<SelectOptionConfig>;
  private eventSource = new Subject<SelectOptionConfig>();

  constructor(private option: SelectOptionConfig) {
    this.onCheck = this.eventSource.asObservable();

    this.elementRef.classList.add('tbus-toolbar-menu-item');
    this.elementRef.type = 'button';

    const label = document.createElement('span');
    label.classList.add('tbus-toolbar-menu-item-label');
    if (option.classes) {
      label.classList.add(...(option.classes || []));
    }
    label.innerText = option.label || option.value;
    this.elementRef.appendChild(label);
    if (option.keymap) {
      const keymapHTML = document.createElement('span');
      keymapHTML.classList.add('tbus-toolbar-menu-item-keymap');
      keymapHTML.innerHTML = createKeymapHTML(option.keymap);
      this.elementRef.appendChild(keymapHTML);
    }
    this.elementRef.addEventListener('click', () => {
      this.eventSource.next(option);
    });
  }
}

class SelectViewer implements DropdownViewer {
  elementRef = document.createElement('div');
  onComplete: Observable<SelectOptionConfig>;
  private completeEvent = new Subject<SelectOptionConfig>();

  constructor(private options: SelectOptionConfig[] = [], private inner: HTMLElement) {
    this.onComplete = this.completeEvent.asObservable();
    this.elementRef.classList.add('tbus-toolbar-menu');

    options.forEach(option => {
      const item = new SelectOptionHandler(option);
      this.elementRef.appendChild(item.elementRef);
      if (option.default) {
        inner.innerText = option.label || option.value;
      }
      item.onCheck.subscribe(v => {
        this.completeEvent.next(v);
      });
    });
  }
}

export class SelectHandler implements Tool {
  readonly elementRef: HTMLElement;
  options: SelectOptionHandler[] = [];
  onApply: Observable<any>;
  keymapAction: KeymapAction[] = [];
  commander: Commander;
  private applyEventSource = new Subject<any>();
  private value = '';
  private textContainer: HTMLElement;
  private dropdown: Dropdown;
  private viewer: SelectViewer;

  constructor(private config: SelectConfig,
              private stickyElement: HTMLElement) {
    this.commander = config.commanderFactory();
    this.onApply = this.applyEventSource.asObservable();

    const dropdownInner = document.createElement('span');
    this.viewer = new SelectViewer(this.config.options, dropdownInner);
    this.textContainer = dropdownInner;
    dropdownInner.classList.add('tbus-select-button', ...config.classes || []);
    config.mini && dropdownInner.classList.add('tbus-select-button-mini');

    this.config.options.forEach(option => {
      if (option.keymap) {
        this.keymapAction.push({
          keymap: option.keymap,
          action: () => {
            if (!this.dropdown.disabled) {
              this.value = option.value;
              this.commander.updateValue(option.value);
              this.applyEventSource.next();
            }
          }
        })
      }
    })

    this.viewer.onComplete.subscribe(option => {
      this.value = option.value;
      this.commander.updateValue(option.value);
      this.applyEventSource.next();
    })

    this.dropdown = new Dropdown(
      dropdownInner,
      this.viewer,
      config.tooltip,
      stickyElement
    );
    this.elementRef = this.dropdown.elementRef;
  }

  updateStatus(selectionMatchDelta: SelectionMatchDelta): void {
    if (selectionMatchDelta.matchData) {
      const option = this.config.highlight(this.config.options, selectionMatchDelta.matchData);
      if (option) {
        this.textContainer.innerText = option.label || option.value;
        this.dropdown.disabled = false;
        this.dropdown.highlight = true;
        return;
      }
    }
    this.dropdown.highlight = false;
    this.dropdown.disabled = selectionMatchDelta.state === HighlightState.Disabled;
    let defaultOption: SelectOptionConfig;
    for (const op of this.config.options) {
      if (op.default) {
        defaultOption = op;
        break;
      }
    }
    if (defaultOption) {
      this.textContainer.innerText = defaultOption.label || defaultOption.value;
    }
  }
}
