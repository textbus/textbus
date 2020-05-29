import { Renderer } from './renderer';
import { TBSelection } from './selection';
import { Commander } from './commander';
import { Editor } from '../editor';

export interface Lifecycle {
  onInit?(): void;

  onInput?(renderer: Renderer, selection: TBSelection): boolean;

  onEnter?(renderer: Renderer, selection: TBSelection): boolean;

  onDelete?(renderer: Renderer, selection: TBSelection): boolean;

  onSelectionChange?(): void;

  onApplyCommand?(commander: Commander, selection: TBSelection, editor: Editor): boolean;

  onRender?(): void;
}
