import { Observable } from 'rxjs';

import { Tool } from './help';
import { HighlightState } from '../help';
import { Matcher, SelectionMatchState } from '../matcher/_api';
import { Commander } from '../commander';
import { UIDropdown, UIKit } from '../../uikit/uikit';

export interface DropdownViewer<T = any> {
  elementRef: HTMLElement;
  onComplete: Observable<any>;
  onClose?: Observable<void>;

  update?(value?: T): void;

  reset?(): void;
}

export interface DropdownToolConfig {
  /** 下拉控件展开后显示的内容 */
  menuFactory(): DropdownViewer;

  /** 锚中节点的的匹配项配置 */
  matcher?: Matcher;

  /** 订阅下拉控件操作完成时调用的命令 */
  commanderFactory(): Commander;

  /** 给当前控件添加一组 css class */
  classes?: string[];
  /** 给当前控件添加一组 icon css class */
  iconClasses?: string[];
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: string;
  /** 设置控件显示的文字 */
  label?: string;
}

export class DropdownHandler implements Tool {
  elementRef: HTMLElement;
  onApply: Observable<any>;
  commander: Commander;
  private dropdown: UIDropdown;
  private viewer: DropdownViewer;

  constructor(private config: DropdownToolConfig,
              private stickyElement: HTMLElement) {
    this.commander = config.commanderFactory();
    const viewer = config.menuFactory();
    this.viewer = viewer;
    this.onApply = viewer.onComplete;

    this.dropdown = UIKit.dropdown({
      button: {
        ...config
      },
      menu: viewer.elementRef,
      stickyElement
    });

    this.elementRef = this.dropdown.elementRef;
  }

  updateStatus(selectionMatchState: SelectionMatchState): void {
    this.viewer.update(selectionMatchState.matchData);
    switch (selectionMatchState.state) {
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

  onDestroy() {
    //
  }
}
