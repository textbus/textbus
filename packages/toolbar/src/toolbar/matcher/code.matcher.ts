import { PreComponent } from '@textbus/components';
import { TBSelection } from '@textbus/core';

import { Matcher, SelectionMatchState } from './matcher';
import { HighlightState } from '../help';

export class CodeMatcher implements Matcher {

  queryState(selection: TBSelection): SelectionMatchState {
    if (selection.rangeCount === 0) {
      return {
        srcStates: [],
        matchData: null,
        state: HighlightState.Normal
      }
    }
    const contextComponents = selection.ranges.map(range => {
      if (range.commonAncestorComponent instanceof PreComponent) {
        return range.commonAncestorComponent;
      }
      return range.commonAncestorFragment?.getContext(PreComponent);
    });
    return {
      state: contextComponents.map(i => !!i).includes(false) ? HighlightState.Normal : HighlightState.Highlight,
      srcStates: [],
      matchData: contextComponents[0]
    }
  }
}
