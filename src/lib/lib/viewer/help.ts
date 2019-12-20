import { Commander } from '../commands/commander';
import { EditContext } from '../toolbar/help';
import { TBInputEvent } from './cursor';
import { ViewRenderer } from './view-renderer';
import { Contents } from '../parser/contents';

export interface Hook {
  setup?(frameContainer: HTMLElement, context: EditContext): void;

  onSelectionChange?(range: Range, document: Document): Range | Range[];

  onViewChange?(): void;

  onInput?(ev: TBInputEvent, viewer: ViewRenderer, next: () => void): void;

  onEnter?(viewer: ViewRenderer, next: () => void): void;

  onDelete?(viewer: ViewRenderer, next: () => void): void;

  onPaste?(contents: Contents, viewer: ViewRenderer, next: () => void): void;

  onApply?(commander: Commander): void;
}
