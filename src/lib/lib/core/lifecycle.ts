import { Renderer } from './renderer';
import { TBSelection } from './selection';
import { Commander } from './commander';
import { Editor } from '../editor';
import { Contents } from './contents';

export interface Lifecycle {
  setup?(document: Document): void;

  onInit?(): void;

  onInput?(renderer: Renderer, selection: TBSelection): boolean;

  onPaste?(contents: Contents, renderer: Renderer, selection: TBSelection): boolean;

  onEnter?(renderer: Renderer, selection: TBSelection): boolean;

  onDelete?(renderer: Renderer, selection: TBSelection): boolean;

  onSelectionChange?(): void;

  onApplyCommand?(commander: Commander, selection: TBSelection, editor: Editor): boolean;

  onRender?(): void;

  onOutput?(contents: string): string;
}
