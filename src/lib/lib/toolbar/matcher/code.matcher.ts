import { Matcher, SelectionMatchDelta } from './matcher';
import { TBSelection, Renderer } from '../../core/_api';
import { HighlightState } from '../help';
import { PreTemplate } from '../../templates/pre.template';

export class CodeMatcher implements Matcher {

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    const contextTemplates = selection.ranges.map(range => {
      if (range.commonAncestorTemplate instanceof PreTemplate) {
        return range.commonAncestorTemplate;
      }
      return renderer.getContext(range.commonAncestorFragment, PreTemplate);
    });
    return {
      state: contextTemplates.map(i => !!i).includes(false) ? HighlightState.Normal : HighlightState.Highlight,
      srcStates: [],
      matchData: contextTemplates[0]
    }
  }
}
