import { TBSelection, Constructor, Renderer } from '../../core/_api';
import { Matcher, SelectionMatchDelta } from './matcher';
import { BlockTemplate } from '../../templates/block.template';
import { HighlightState } from '../help';

export class BlockMatcher implements Matcher {
  constructor(public templateConstructor: Constructor<BlockTemplate>) {
  }

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    const contextTemplates = selection.ranges.map(range => {
      if (range.commonAncestorTemplate instanceof this.templateConstructor) {
        return range.commonAncestorTemplate;
      }
      return renderer.getContext(range.commonAncestorFragment, this.templateConstructor);
    });
    return {
      state: contextTemplates.map(i => !!i).includes(false) ? HighlightState.Normal : HighlightState.Highlight,
      srcStates: [],
      matchData: contextTemplates[0]
    }
  }
}
