import { Observable } from 'rxjs';

import { ContextMenuConfig, Tool } from './help';
import { EventDelegate, HighlightState } from '../help';
import { Matcher, SelectionMatchDelta } from '../matcher/_api';
import { Commander } from '../../core/_api';
import { UIDropdown, UIKit } from '../../uikit/uikit';

export interface DropdownViewer<T = any> {
  elementRef: HTMLElement | DocumentFragment;
  onComplete: Observable<any>;
  freezeState?: Observable<boolean>;

  update?(value?: T): void;

  reset?(): void;

  setEventDelegator?(delegate: EventDelegate): void;
}

export interface DropdownConfig {
  /** 下拉控件展开后显示的内容 */
  menuFactory(): DropdownViewer;

  /** 锚中节点的的匹配项配置 */
  matcher?: Matcher;

  /** 订阅下拉控件操作完成时调用的命令 */
  commanderFactory(): Commander;

  /** 设置上下文菜单 */
  contextMenu?: Array<ContextMenuConfig>;
  /** 给当前控件添加一组 css class */
  classes?: string[];
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: string;
  /** 设置控件显示的文字 */
  label?: string;
  /** 是否支持源代码编辑模式 */
  supportSourceCodeModel?: boolean;
}

export class DropdownHandler implements Tool {
  elementRef: HTMLElement;
  onApply: Observable<any>;
  commander: Commander;
  private dropdown: UIDropdown;
  private viewer: DropdownViewer;

  constructor(private config: DropdownConfig,
              private delegate: EventDelegate,
              private stickyElement: HTMLElement) {
    this.commander = config.commanderFactory();
    const viewer = config.menuFactory();
    this.viewer = viewer;
    this.onApply = viewer.onComplete;

    this.dropdown = UIKit.dropdown({
      button: {
        label: config.label,
        classes: config.classes,
        tooltip: config.tooltip
      },
      menu: viewer.elementRef,
      stickyElement
    });

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
    this.viewer.update(selectionMatchDelta.matchData);
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
    // this.dropdown.expand = is;
  }
}
