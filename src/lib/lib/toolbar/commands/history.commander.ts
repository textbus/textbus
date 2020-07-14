import { Commander, TBSelection, Renderer, Fragment } from '../../core/_api';
import { Editor } from '../../editor';

export class HistoryCommander implements Commander<Editor> {
  recordHistory = false;

  private editor: Editor;

  constructor(private action: 'forward' | 'back') {
  }

  updateValue(value: Editor) {
    this.editor = value;
  }

  command(selection: TBSelection, overlap: boolean, renderer: Renderer, rootFragment: Fragment) {
    const snapshot = this.action === 'back' ?
      this.editor.history.getPreviousSnapshot() :
      this.editor.history.getNextSnapshot();
    if (snapshot) {
      rootFragment.from(snapshot.contents);
      selection.usePaths(snapshot.paths, rootFragment);
    }
  }
}
