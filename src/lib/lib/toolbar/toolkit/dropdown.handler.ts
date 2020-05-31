import { Observable } from 'rxjs';

import { ContextMenuConfig, Tool } from './help';
import { Dropdown, DropdownHandlerView } from './utils/dropdown';
import { EventDelegate, HighlightState } from '../help';
import { Matcher, SelectionMatchDelta } from '../matcher/_api';
import { Commander } from '../../core/_api';

export interface DropdownConfig {
  /** 下拉控件展开后显示的内容 */
  viewer: DropdownHandlerView;
  /** 订阅下拉控件操作完成时的观察者 */
  onHide: Observable<any>;
  /** 锚中节点的的匹配项配置 */
  match?: Matcher;
  /** 订阅下拉控件操作完成时调用的命令 */
  execCommand: Commander;
  /** 设置上下文菜单 */
  contextMenu?: Array<ContextMenuConfig>;
  /** 给当前控件添加一组 css class */
  classes?: string[];
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: string;
  /** 设置控件显示的文字 */
  label?: string;
}

export class DropdownHandler implements Tool {
  elementRef: HTMLElement;
  onApply: Observable<any>;
  private dropdownButton = document.createElement('span');
  private dropdown: Dropdown;

  constructor(private config: DropdownConfig,
              private delegate: EventDelegate,
              private stickyElement: HTMLElement) {
    this.onApply = config.onHide;
    this.dropdownButton.innerText = config.label || '';

    this.dropdownButton.classList.add(...(config.classes || []));

    this.dropdown = new Dropdown(
      this.dropdownButton,
      config.viewer.elementRef,
      config.onHide,
      config.tooltip,
      stickyElement
    );

    this.elementRef = this.dropdown.elementRef;

    if (typeof config.viewer.setEventDelegator === 'function') {
      config.viewer.setEventDelegator(delegate);
    }
    if (config.viewer.freezeState instanceof Observable) {
      config.viewer.freezeState.subscribe(b => {
        this.dropdown.freeze = b;
      });
    }
  }

  updateStatus(selectionMatchDelta: SelectionMatchDelta): void {
    this.config.viewer.update(selectionMatchDelta.matchData);
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

  expand(is: boolean) {
    is ? this.dropdown.show() : this.dropdown.hide();
  }
}
