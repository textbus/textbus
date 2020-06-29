import { Observable } from 'rxjs';

import { ContextMenuConfig, Tool } from './help';
import { Dropdown, DropdownViewer } from './utils/dropdown';
import { EventDelegate, HighlightState } from '../help';
import { Matcher, SelectionMatchDelta } from '../matcher/_api';
import { Commander, FormatAbstractData } from '../../core/_api';
import { map } from 'rxjs/operators';

export interface DropdownConfig {
  /** 下拉控件展开后显示的内容 */
  menuFactory(): DropdownViewer;

  /** 锚中节点的的匹配项配置 */
  matcher?: Matcher;

  /** 订阅下拉控件操作完成时调用的命令 */
  execCommand(): Commander;

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
  commander: Commander;
  private dropdownButton = document.createElement('span');
  private dropdown: Dropdown;
  private viewer: DropdownViewer;

  constructor(private config: DropdownConfig,
              private delegate: EventDelegate,
              private stickyElement: HTMLElement) {
    this.commander = config.execCommand();
    const viewer = config.menuFactory();
    this.viewer = viewer;
    this.onApply = viewer.onComplete.pipe(map(result => {
      this.commander?.updateValue(result);
    }));
    this.dropdownButton.innerText = config.label || '';

    this.dropdownButton.classList.add(...(config.classes || []));

    this.dropdown = new Dropdown(
      this.dropdownButton,
      viewer,
      config.tooltip,
      stickyElement
    );

    this.elementRef = this.dropdown.elementRef;

    if (typeof viewer.setEventDelegator === 'function') {
      viewer.setEventDelegator(delegate);
    }
    if (viewer.freezeState instanceof Observable) {
      viewer.freezeState.subscribe(b => {
        this.dropdown.freeze = b;
      });
    }
  }

  updateStatus(selectionMatchDelta: SelectionMatchDelta): void {
    const matchData = selectionMatchDelta.matchData;
    this.viewer.update(matchData instanceof FormatAbstractData ? matchData.attrs : matchData);
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
    this.dropdown.expand = is;
  }
}
