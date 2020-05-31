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
      this.editor.getPreviousSnapshot() :
      this.editor.getNextSnapshot();
    if (snapshot) {
      rootFragment.clean();
      snapshot.contents.sliceContents(0).forEach(item => {
        rootFragment.append(item);
      });
      snapshot.contents.getFormatRanges().forEach(f => rootFragment.mergeFormat(f));
      selection.usePaths(snapshot.paths, rootFragment);
    }
  }
}
