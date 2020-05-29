import { Lifecycle } from '../core/lifecycle';
import { TBSelection } from '../core/selection';
import { Editor } from '../editor';
import { Commander } from '../core/commander';
import { HistoryCommander } from '../toolbar/commands/history.commander';

export class HistoryHook implements Lifecycle {
  onApplyCommand(commander: Commander, selection: TBSelection, editor: Editor): boolean {
    if (commander instanceof HistoryCommander) {
      commander.updateValue(editor);
    }
    return true;
  }
}
