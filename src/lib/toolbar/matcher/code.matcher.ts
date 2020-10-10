import { Matcher, SelectionMatchState } from './matcher';
import { TBSelection, Renderer } from '../../core/_api';
import { HighlightState } from '../help';
import { PreComponent } from '../../components/pre.component';

export class CodeMatcher implements Matcher {

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchState {
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
      return renderer.getContext(range.commonAncestorFragment, PreComponent);
    });
    return {
      state: contextComponents.map(i => !!i).includes(false) ? HighlightState.Normal : HighlightState.Highlight,
      srcStates: [],
      matchData: contextComponents[0]
    }
  }
}
