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
  setup?(frameContainer: HTMLElement, context: EditContext): void;

  onSelectStart?(selection: Selection, next: () => void): void;

  onFocus?(viewer: Viewer, next: () => void): void;

  onCursorMove?(direction: CursorMoveDirection, viewer: Viewer, next: () => void): void;

  /**
   * 当编辑器选区变化时调用
   * @param range 原始的选区
   * @param document 编辑器的 Document 对象
   * @param next
   */
  onSelectionChange?(range: Range, document: Document, next: () => void): Range | Range[];

  /**
   * 当编辑器视图发生变化后调用
   */
  onViewChange?(): void;

  /**
   * 当用户输入文本时调用
   * @param snapshot
   * @param viewer 视图渲染器
   * @param parser
   * @param next 当前勾子逻辑处理完成后同步调用
   */
  onInput?(snapshot: EditingSnapshot, viewer: Viewer, parser: Parser, next: () => void): void;

  onViewUpdateBefore?(viewer: Viewer, parser: Parser, next: () => void): void;

  onViewUpdated?(viewer: Viewer, next: () => void): void;

  /**
   * 当用户输入回车时调用
   * @param snapshot
   * @param viewer 视图渲染器
   * @param parser
   * @param next 当前勾子逻辑处理完成后同步调用
   */
  onEnter?(snapshot: EditingSnapshot, viewer: Viewer, parser: Parser, next: () => void): void;

  /**
   * 当用户删除内容时调用
   * @param viewer 视图渲染器
   * @param parser
   * @param next 当前勾子逻辑处理完成后同步调用
   */
  onDelete?(viewer: Viewer, parser: Parser, next: () => void): void;

  /**
   * 当用户粘贴内容时调用
   * @param contents
   * @param viewer 视图渲染器
   * @param parser
   * @param next 当前勾子逻辑处理完成后同步调用
   */
  onPaste?(contents: Contents, viewer: Viewer, parser: Parser, next: () => void): void;

  /**
   * 当用户应用某个命令时调用
   * @param commander 当前应用的命令
   */
  onApply?(commander: Commander): void;
}
