import { EditContext, Hook } from '../../viewer/help';
import { Commander } from '../../commands/commander';
import { Editor } from '../../editor';

export class HistoryHook implements Hook {
  private editor: Editor;
  setup(frameContainer: HTMLElement, context: EditContext): void {
    this.editor = context.editor;
  }

  onApply(commander: Commander<any>): void {
    commander.updateValue(this.editor);
  }
}

export const historyHook = new HistoryHook();
