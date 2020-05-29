import { Commander } from '../../core/commander';
import { TBSelection } from '../../core/selection';
import { Editor } from '../../editor';
import { Renderer } from '../../core/renderer';
import { Fragment } from '../../core/fragment';

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
      const t = snapshot.contents.clone();
      t.sliceContents(0).forEach(item => {
        rootFragment.append(item);
      });
      t.getFormatRanges().forEach(f => rootFragment.mergeFormat(f));
      selection.usePaths(snapshot.paths, rootFragment);
    }
  }
}
