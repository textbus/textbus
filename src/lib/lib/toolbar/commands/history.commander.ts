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
    console.log(this.editor)
    const snapshot = this.action === 'back' ?
      this.editor.getPreviousSnapshot() :
      this.editor.getNextSnapshot();
    if (snapshot) {
      // rootFragment.cleanFormats();
      // rootFragment.useContents(new Contents());
      // rootFragment.insertFragmentContents(snapshot.doc.clone(), 0);
      // selection.usePaths(snapshot.paths, rootFragment);
    }
  }
}
