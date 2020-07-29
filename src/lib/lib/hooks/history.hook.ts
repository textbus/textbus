import { Lifecycle, TBSelection, Commander } from '../core/_api';
import { HistoryCommander } from '../toolbar/_api';
import { Editor } from '../editor';

export class HistoryHook implements Lifecycle {
  onApplyCommand(commander: Commander<any>, selection: TBSelection, editor: Editor): boolean {
    if (commander instanceof HistoryCommander) {
      commander.set(editor);
    }
    return true;
  }
}
