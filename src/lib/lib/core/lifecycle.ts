import { Renderer } from './renderer';
import { TBSelection } from './selection';
import { Commander } from './commander';
import { Editor } from '../editor';
import { Contents } from './contents';

export interface Lifecycle {
  setup?(renderer: Renderer, contextDocument: Document, contextWindow: Window, frameContainer: HTMLElement): void;

  onInit?(): void;

  onInput?(renderer: Renderer, selection: TBSelection): boolean;

  onPaste?(contents: Contents, renderer: Renderer, selection: TBSelection): boolean;

  onEnter?(renderer: Renderer, selection: TBSelection): boolean;

  onDelete?(renderer: Renderer, selection: TBSelection): boolean;

  onSelectionChange?(renderer: Renderer, selection: TBSelection, contextDocument: Document): void;

  onApplyCommand?(commander: Commander, selection: TBSelection, editor: Editor): boolean;

  onViewUpdated?(): void;

  onOutput?(contents: string): string;
}
