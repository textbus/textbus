import { Commander } from './commander';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { RootFragment } from '../parser/root-fragment';
import { Contents } from '../parser/contents';
import { Editor } from '../editor';

export class HistoryCommander implements Commander<Editor> {
  recordHistory = false;
  private editor: Editor;
  constructor(private action: 'forward' | 'back') {
  }

  updateValue(value: Editor): void {
    this.editor = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean, rootFragment: RootFragment) {
    const snapshot = this.action === 'back' ?
      this.editor.getPreviousSnapshot() :
      this.editor.getNextSnapshot();
    if (snapshot) {
      rootFragment.cleanFormats();
      rootFragment.useContents(new Contents());
      rootFragment.insertFragmentContents(snapshot.doc.clone(), 0);
      selection.usePaths(snapshot.paths, rootFragment);
    }
  }

  render(): null {
    return null;
  }
}
