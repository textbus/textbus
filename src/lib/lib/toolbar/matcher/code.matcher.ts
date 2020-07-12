import { Matcher, SelectionMatchDelta } from './matcher';
import { TBSelection, Renderer } from '../../core/_api';
import { HighlightState } from '../help';
import { PreComponent } from '../../components/pre.component';

export class CodeMatcher implements Matcher {

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    if (selection.rangeCount === 0) {
      return {
        srcStates: [],
        matchData: null,
        state: HighlightState.Normal
      }
    }
    const contextTemplates = selection.ranges.map(range => {
      if (range.commonAncestorTemplate instanceof PreComponent) {
        return range.commonAncestorTemplate;
      }
      return renderer.getContext(range.commonAncestorFragment, PreComponent);
    });
    return {
      state: contextTemplates.map(i => !!i).includes(false) ? HighlightState.Normal : HighlightState.Highlight,
      srcStates: [],
      matchData: contextTemplates[0]
    }
  }
}
