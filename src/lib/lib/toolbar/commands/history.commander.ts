import { Commander, CommandContext } from '../../core/_api';
import { Editor } from '../../editor';

export class HistoryCommander implements Commander<null> {
  recordHistory = false;

  private editor: Editor;

  constructor(private action: 'forward' | 'back') {
  }

  set(v: Editor) {
    this.editor = v;
  }

  command(context: CommandContext) {
    const snapshot = this.action === 'back' ?
      this.editor.history.getPreviousSnapshot() :
      this.editor.history.getNextSnapshot();
    if (snapshot) {
      context.rootFragment.from(snapshot.contents);
      context.selection.usePaths(snapshot.paths, context.rootFragment);
    }
  }
}
