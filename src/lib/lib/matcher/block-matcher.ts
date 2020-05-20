import { Matcher, SelectionMatchDelta } from './matcher';
import { TBSelection } from '../viewer/selection';
import { BlockTemplate } from '../templates/block';
import { Constructor, Renderer } from '../core/renderer';
import { HighlightState } from '../toolbar/help';

export class BlockMatcher implements Matcher {
  constructor(public templateConstructor: Constructor<BlockTemplate>) {
  }

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    const contextTemplates = selection.ranges.map(range => {
      return renderer.getContext(range.commonAncestorFragment, this.templateConstructor);
    });
    return {
      state: contextTemplates.map(i => !!i).includes(false) ? HighlightState.Normal : HighlightState.Highlight
    }
  }
}
