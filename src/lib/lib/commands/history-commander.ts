import { Commander } from './commander';
import { FormatState } from '../matcher/matcher';
import { Fragment } from '../parser/fragment';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { RootFragment } from '../parser/root-fragment';
import { Contents } from '../parser/contents';

export class HistoryCommander implements Commander {
  recordHistory = false;

  constructor(private action: 'forward' | 'back') {
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean, rootFragment: RootFragment): Fragment {
    const snapshot = this.action === 'back' ?
      rootFragment.editor.getPreviousSnapshot() :
      rootFragment.editor.getNextSnapshot();
    if (snapshot) {
      rootFragment.destroyView();
      rootFragment.useContents(new Contents());
      rootFragment.insertFragmentContents(snapshot.doc, 0);
      selection.usePaths(snapshot.paths, snapshot.doc);
    }
    return rootFragment;
  }

  render(state: FormatState, rawElement?: HTMLElement): null {
    return null;
  }
}
