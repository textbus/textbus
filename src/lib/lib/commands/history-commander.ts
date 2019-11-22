import { Commander } from './commander';
import { FormatState } from '../matcher/matcher';
import { Fragment } from '../parser/fragment';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';
import { RootFragment } from '../parser/root-fragment';

export class HistoryCommander implements Commander<any> {
  recordHistory = false;
  constructor(private action: 'forward' | 'back') {
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
    const commonAncestorFragment = selection.commonAncestorFragment;
    const root = HistoryCommander.getRootFragment(commonAncestorFragment) as RootFragment;
    const snapshot = this.action === 'back' ? root.editor.getPreviousSnapshot() : root.editor.getNextSnapshot();
    if (snapshot) {
      Object.assign(selection, snapshot.selection);
      root.contents = snapshot.doc.contents;
      root.formatMatrix = snapshot.doc.formatMatrix;
    }
  }

  render(state: FormatState, rawElement?: HTMLElement): null {
    return null;
  }

  private static getRootFragment(fragment: Fragment) {
    while (fragment.parent) {
      fragment = fragment.parent;
    }
    return fragment;
  }
}
