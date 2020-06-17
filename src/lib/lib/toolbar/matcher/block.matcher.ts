import { TBSelection, Constructor, Renderer } from '../../core/_api';
import { Matcher, SelectionMatchDelta } from './matcher';
import { BlockTemplate } from '../../templates/block.template';
import { HighlightState } from '../help';

export class BlockMatcher implements Matcher {
  constructor(public templateConstructor: Constructor<BlockTemplate>, private tagNames: string[]) {
  }

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    const contextTemplates = selection.ranges.map(range => {
      if (range.commonAncestorTemplate instanceof this.templateConstructor &&
        this.tagNames.includes(range.commonAncestorTemplate.tagName)) {
        return range.commonAncestorTemplate;
      }
      return renderer.getContext(range.commonAncestorFragment, this.templateConstructor, instance => {
        return this.tagNames.includes(instance.tagName);
      });
    });
    return {
      state: contextTemplates.map(i => !!i).includes(false) && contextTemplates.length ? HighlightState.Normal : HighlightState.Highlight,
      srcStates: [],
      matchData: contextTemplates[0]
    }
  }
}
