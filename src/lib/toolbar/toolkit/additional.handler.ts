import { Observable, Subject, Subscription } from 'rxjs';

import { Tool } from './help';
import { Keymap, KeymapAction, Commander } from '../../core/_api';
import { Matcher, SelectionMatchState } from '../matcher/matcher';
import { UIButton, UIKit } from '../../uikit/uikit';
import { HighlightState } from '../../toolbar/help';

export interface AdditionalViewer<T = any> {
  elementRef: HTMLElement;
  onAction: Observable<T>;
  onDestroy: Observable<void>;

  destroy(): void;
}

/**
 * 按扭型工具的配置接口
 */
export interface AdditionalToolConfig<T = any> {
  /** 按扭控件点击后调用的命令 */
  commanderFactory(): Commander;

  /** 下拉控件展开后显示的内容 */
  menuFactory(): AdditionalViewer<T>;

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
  supportSourceCodeMode?: boolean;
}

export class AdditionalHandler<T = any> implements Tool<T> {
  readonly elementRef: HTMLButtonElement;
  onApply: Observable<T>;
  onShow: Observable<AdditionalViewer<T>>;
  keymapAction: KeymapAction;
  commander: Commander;
  private eventSource = new Subject<T>();
  private button: UIButton;
  private showEvent = new Subject<AdditionalViewer>();

  private subs: Subscription[] = [];

  constructor(private config: AdditionalToolConfig) {
    this.commander = config.commanderFactory();

    this.onShow = this.showEvent.asObservable();
    this.onApply = this.eventSource.asObservable();

    this.button = UIKit.button({
      label: config.label,
      classes: config.classes,
      tooltip: config.tooltip,
      iconClasses: config.iconClasses,
      onChecked: () => {
        this.button.highlight = true;
        this.show();
      }
    });
    this.elementRef = this.button.elementRef;

    if (config.keymap) {
      this.keymapAction = {
        keymap: config.keymap,
        action: () => {
          if (!this.button.disabled) {
            this.button.highlight = true;
            this.show();
          }
        }
      };
      this.elementRef.dataset.keymap = JSON.stringify(config.keymap);
    }
  }

  updateStatus(selectionMatchState: SelectionMatchState): void {
    switch (selectionMatchState.state) {
      case HighlightState.Highlight:
        this.button.disabled = false;
        this.button.highlight = true;
        break;
      case HighlightState.Normal:
        this.button.disabled = false;
        this.button.highlight = false;
        break;
      case HighlightState.Disabled:
        this.button.disabled = true;
        this.button.highlight = false;
        break;
    }
  }

  onDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  private show() {
    const viewer = this.config.menuFactory();
    this.subs.push(viewer.onAction.subscribe(params => {
        this.eventSource.next(params);
      }),
      viewer.onDestroy.subscribe(() => {
        this.button.highlight = false;
      })
    );
    this.showEvent.next(viewer);
  }
}
