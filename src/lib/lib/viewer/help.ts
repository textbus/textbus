import { Commander } from '../commands/commander';
import { Viewer } from './viewer';
import { Editor } from '../editor';
import { Parser } from '../parser/parser';
import { TBSelection } from './selection';
import { Fragment } from '../parser/fragment';
import { Contents } from '../parser/contents';

export interface EditContext {
  document: Document;
  window: Window;
  editor: Editor;
}

export enum CursorMoveDirection {
  Left,
  Right,
  Up,
  Down
}

export interface EditingSnapshot {
  beforeSelection: TBSelection;
  beforeFragment: Fragment;
  value: string;
  cursorOffset: number;
}

export interface Hook {
  /**
   * 当编辑器初始化时调用
   * @param frameContainer 编辑器所在容器
   * @param context 编辑器的全局对象
   */
  setup?(frameContainer: HTMLElement, context: EditContext): any;

  /**
   * 当用户开始选择时调用
   * @param selection
   */
  onSelectStart?(selection: Selection): boolean;

  /**
   * 当编辑框获得焦点时调用
   * @param viewer
   */
  onFocus?(viewer: Viewer): boolean;

  /**
   * 当编辑器选区变化时调用
   * @param range 原始的选区
   * @param document 编辑器的 Document 对象
   * @param next
   */
  onSelectionChange?(range: Range, document: Document, next: () => void): Range | Range[];

  /**
   * 当用户输入文本时调用
   * @param snapshot
   * @param viewer 视图渲染器
   * @param parser
   */
  onInput?(snapshot: EditingSnapshot, viewer: Viewer, parser: Parser): boolean;

  /**
   * 当视图重绘前调用
   * @param viewer
   * @param parser
   */
  onViewUpdateBefore?(viewer: Viewer, parser: Parser): boolean;

  /**
   * 当编辑器视图发生变化后调用
   */
  onViewChange?(viewer: Viewer): boolean;

  /**
   * 当用户输入回车时调用
   * @param snapshot
   * @param viewer 视图渲染器
   * @param parser
   */
  onEnter?(snapshot: EditingSnapshot, viewer: Viewer, parser: Parser): boolean;

  /**
   * 当用户删除内容时调用
   * @param viewer 视图渲染器
   * @param parser
   */
  onDelete?(viewer: Viewer, parser: Parser): boolean;

  /**
   * 当用户粘贴内容时调用
   * @param contents
   * @param viewer 视图渲染器
   * @param parser
   */
  onPaste?(contents: Contents, viewer: Viewer, parser: Parser): boolean;

  /**
   * 当用户应用某个命令时调用
   * @param commander 当前应用的命令
   */
  onApply?(commander: Commander): void;
}
