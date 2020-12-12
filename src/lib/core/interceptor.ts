import { Injector } from '@tanbo/di';

import { TBSelection } from './selection';
import { Commander } from './commander';
import { Editor } from '../editor';
import { Contents } from './contents';
import { Fragment } from './fragment';
import { TBEvent } from './events';
import { AbstractComponent } from './component';

export interface TBClipboard {
  contents: Contents
  text: string;
}

/**
 * TextBus 生命周期方法。
 * 在 TextBus 中，任意与操作数据有关的生命周期方法，都先于虚拟 DOM 的事件执行。
 */
export interface Interceptor<T extends AbstractComponent> {
  setup(injector: Injector): void;
  onInputReady?(): void;
  onInput?(event: TBEvent<T>): void;
  onDeleteRange?(event: TBEvent<T>): void;
  onDelete?(event: TBEvent<T>): void;
  onEnter?(event: TBEvent<T>): void;
  onPaste?(event: TBEvent<T, TBClipboard>): void;

  /**
   * 当 TextBus 初始化时调用。
   * @param renderer
   * @param contextDocument
   * @param contextWindow
   * @param frameContainer
   */
  // setup?(renderer: Renderer, contextDocument: Document, contextWindow: Window, frameContainer: HTMLElement): void;

  /**
   * 当用户输入时调用。
   * @param selection
   */

  /**
   * 用户粘贴时调用。
   * @param clipboard 粘贴的内容。
   * @param selection
   */

  /**
   * 当选区发生变化时调用。
   * @param selection
   * @param contextDocument
   */
  onSelectionChange?(selection: TBSelection, contextDocument: Document): void;

  /**
   * 当应用某 Commander 类时调用。
   * @param commander 当前要应用的 Commander 实例。
   * @param selection
   * @param editor
   * @param rootFragment
   * @param params
   * @param updateParamsFn
   */
  onApplyCommand?(commander: Commander, selection: TBSelection, editor: Editor, rootFragment: Fragment, params: any, updateParamsFn: (newParams: any) => void): boolean;

  /**
   * 当视图更新前调用
   * @param selection
   * @param editor
   * @param rootFragment
   */
  onRenderingBefore?(selection: TBSelection, editor: Editor, rootFragment: Fragment): boolean;

  /**
   * 当视图更新后调用。
   * @param selection
   * @param editor
   * @param rootFragment
   * @param frameContainer
   */
  onViewUpdated?(selection: TBSelection, editor: Editor, rootFragment: Fragment, frameContainer: HTMLElement): void;
}
