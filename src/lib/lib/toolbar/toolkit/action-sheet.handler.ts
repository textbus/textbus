import { merge, Observable, Subject } from 'rxjs';

import { HighlightState } from '../help';
import { Dropdown, DropdownViewer } from './utils/dropdown';
import { Tool, createKeymapHTML, ContextMenuConfig } from './help';
import { Keymap, KeymapAction } from '../../input/input';
import { Commander } from '../../core/_api';
import { Matcher } from '../matcher/_api';

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
  execCommand(): Commander & { actionType: any };

  /** 设置上下文菜单 */
  contextMenu?: ContextMenuConfig[];
  /** 锚中节点的的匹配项配置 */
  match?: Matcher;
  /** 设置控件显示的文字 */
  label?: string;
  /** 给当前控件添加一组 css class */
  classes?: string[];
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: string;
}

class ActionSheetOptionHandler {
  readonly elementRef = document.createElement('button');
  onCheck: Observable<any>;
  private eventSource = new Subject<any>();

  constructor(private option: ActionConfig) {
    this.onCheck = this.eventSource.asObservable();
    this.elementRef.classList.add('tbus-toolbar-menu-item');
    this.elementRef.type = 'button';
    const label = document.createElement('span');
    label.classList.add('tbus-toolbar-menu-item-label');
    if (option.classes) {
      label.classList.add(...(option.classes || []));
    }

    label.innerText = option.label;
    this.elementRef.appendChild(label);
    if (option.keymap) {
      const keymapHTML = document.createElement('span');
      keymapHTML.classList.add('tbus-toolbar-menu-item-keymap');
      keymapHTML.innerHTML = createKeymapHTML(option.keymap);
      this.elementRef.appendChild(keymapHTML);
    }
    this.elementRef.addEventListener('click', () => {
      this.eventSource.next(option.value);
    });
  }
}

class ActionSheetViewer implements DropdownViewer {
  elementRef: HTMLElement = document.createElement('div');
  onComplete: Observable<void>;
  private completeEvent = new Subject<void>();
  private options: ActionSheetOptionHandler[] = [];

  constructor(private actions: ActionConfig[] = []) {
    this.onComplete = this.completeEvent.asObservable();
    this.elementRef.classList.add('tbus-toolbar-menu');

    actions.forEach(option => {
      const item = new ActionSheetOptionHandler(option);
      this.elementRef.appendChild(item.elementRef);
      this.options.push(item);
    });
    merge(...this.options.map(item => item.onCheck)).subscribe(v => {
      this.completeEvent.next(v)
    });
  }
}

export class ActionSheetHandler implements Tool {
  readonly elementRef: HTMLElement;
  onMatched: Observable<ActionConfig>;
  onApply: Observable<any>;
  keymapAction: KeymapAction[] = [];
  commander: Commander & { actionType: any };

  private matchedEvent = new Subject<ActionConfig>();
  private eventSource = new Subject<any>();
  private dropdown: Dropdown;
  private viewer = new ActionSheetViewer(this.config.actions);

  constructor(private config: ActionSheetConfig,
              private stickyElement: HTMLElement) {
    this.onApply = this.eventSource.asObservable();
    this.onMatched = this.matchedEvent.asObservable();

    const dropdownButton = document.createElement('span');
    dropdownButton.classList.add(...config.classes || []);

    this.commander = config.execCommand();

    config.actions.forEach(action => {
      if (action.keymap) {
        this.keymapAction.push({
          keymap: action.keymap,
          action: () => {
            if (!this.dropdown.disabled) {
              this.commander.actionType = action.value;
              this.eventSource.next();
            }
          }
        })
      }
    })

    this.viewer.onComplete.subscribe(v => {
      if (!this.dropdown.disabled) {
        this.commander.actionType = v;
        this.eventSource.next();
      }
    })

    this.dropdown = new Dropdown(
      dropdownButton,
      this.viewer,
      config.tooltip,
      stickyElement
    );
    this.elementRef = this.dropdown.elementRef;
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
