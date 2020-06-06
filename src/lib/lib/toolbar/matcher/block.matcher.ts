import { TBSelection, Constructor, Renderer } from '../../core/_api';
import { Matcher, SelectionMatchDelta } from './matcher';
import { BlockTemplate } from '../../templates/block.template';
import { HighlightState } from '../help';

export class BlockMatcher implements Matcher {
  constructor(public templateConstructor: Constructor<BlockTemplate>, private tagName?: string) {
  }

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    const contextTemplates = selection.ranges.map(range => {
      if (range.commonAncestorTemplate instanceof this.templateConstructor) {
        if (this.tagName) {
          return range.commonAncestorTemplate.tagName === this.tagName ?
            range.commonAncestorTemplate :
            renderer.getContext(range.commonAncestorFragment, this.templateConstructor, instance => {
              return instance.tagName === this.tagName;
            });
        }
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
