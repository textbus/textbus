import { Matcher, SelectionMatchDelta } from './matcher';
import { TBSelection, Constructor, Renderer, MediaTemplate } from '../../core/_api';
import { HighlightState } from '../help';

export class MediaMatcher implements Matcher {
  constructor(public templateConstructor: Constructor<MediaTemplate>) {
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
