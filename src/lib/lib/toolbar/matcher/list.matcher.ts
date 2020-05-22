import { Matcher, SelectionMatchDelta } from './matcher';
import { TBSelection } from '../../viewer/selection';
import { Renderer } from '../../core/renderer';
import { ListTemplate } from '../../templates/list.template';
import { HighlightState } from '../help';

export class ListMatcher implements Matcher {
  constructor(private tagName: 'ul' | 'ol') {
  }

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    const context = renderer.getContext(selection.commonAncestorFragment, ListTemplate);
    if (context && context.tagName === this.tagName) {
      return {
        state: HighlightState.Highlight,
      }
    }
    return {
      state: HighlightState.Normal
    }
  }
}
