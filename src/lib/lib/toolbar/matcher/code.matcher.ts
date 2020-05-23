import { Matcher, SelectionMatchDelta } from './matcher';
import { TBSelection } from '../../viewer/selection';
import { Renderer } from '../../core/renderer';
import { HighlightState } from '../help';
import { CodeTemplate } from '../../templates/code.template';

export class CodeMatcher implements Matcher {

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    const contextTemplates = selection.ranges.map(range => {
      if (range.commonAncestorTemplate instanceof CodeTemplate) {
        return range.commonAncestorTemplate;
      }
      return renderer.getContext(range.commonAncestorFragment, CodeTemplate);
    });
    return {
      state: contextTemplates.map(i => !!i).includes(false) ? HighlightState.Normal : HighlightState.Highlight,
      srcStates: [],
      matchData: contextTemplates[0]
    }
  }
}
