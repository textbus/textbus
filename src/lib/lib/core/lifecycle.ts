import { Renderer } from './renderer';
import { TBSelection } from './selection';
import { Commander } from './commander';
import { Editor } from '../editor';
import { Contents } from './contents';
import { Fragment } from './fragment';

/**
 * TBus 生命周期方法。
 * 在 TBus 中，任意与操作数据有关的生命周期方法，都先于虚拟 DOM 的事件执行。
 */
export interface Lifecycle {

  /**
   * 当 TBus 初始化时调用。
   * @param renderer
   * @param contextDocument
   * @param contextWindow
   * @param frameContainer
   */
  setup?(renderer: Renderer, contextDocument: Document, contextWindow: Window, frameContainer: HTMLElement): void;

  /**
   * 当用户输入时调用。
   * @param renderer
   * @param selection
   */
  onInput?(renderer: Renderer, selection: TBSelection): boolean;

  /**
   * 用户粘贴时调用。
   * @param contents 粘贴的内容。
   * @param renderer
   * @param selection
   */
  onPaste?(contents: Contents, renderer: Renderer, selection: TBSelection): boolean;

  /**
   * 当用户敲击回车时调用。
   * @param renderer
   * @param selection
   */
  onEnter?(renderer: Renderer, selection: TBSelection): boolean;

  /**
   * 当用户删除时调用。
   * @param renderer
   * @param selection
   */
  onDelete?(renderer: Renderer, selection: TBSelection): boolean;

  /**
   * 当选区发生变化时调用。
   * @param renderer
   * @param selection
   * @param contextDocument
   */
  onSelectionChange?(renderer: Renderer, selection: TBSelection, contextDocument: Document): void;

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
   * @param renderer
   * @param selection
   * @param editor
   * @param rootFragment
   */
  onRenderingBefore?(renderer: Renderer, selection: TBSelection, editor: Editor, rootFragment: Fragment): boolean;

  /**
   * 当视图更新后调用。
   * @param renderer
   * @param selection
   * @param editor
   * @param rootFragment
   */
  onViewUpdated?(renderer: Renderer, selection: TBSelection, editor: Editor, rootFragment: Fragment): void;
}
