import { Matcher, RangeMatchDelta, SelectionMatchDelta } from './matcher';
import { Constructor, LeafTemplate, Renderer, TBSelection } from '../../core/_api';
import { HighlightState } from '../help';

export class MediaMatcher implements Matcher {
  constructor(public templateConstructor: Constructor<LeafTemplate>, public tagName: string) {
  }

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    const states: RangeMatchDelta<LeafTemplate>[] = selection.ranges.map(range => {
      if (range.startFragment === range.endFragment && range.endIndex - range.startIndex === 1) {
        const content = range.startFragment.sliceContents(range.startIndex, range.endIndex);
        if (content[0] instanceof this.templateConstructor && content[0].tagName === this.tagName) {
          return {
            srcData: content[0],
            fromRange: range,
            state: HighlightState.Highlight
          };
        }
      }
      return {
        state: HighlightState.Normal,
        fromRange: range,
        srcData: null
      };
    });
    for (const s of states) {
      if (s.state !== HighlightState.Highlight) {
        return {
          state: HighlightState.Normal,
          srcStates: states,
          matchData: states[0]?.srcData
        }
      }
    }
    return {
      state: HighlightState.Highlight,
      srcStates: states,
      matchData: states[0]?.srcData
    }
  }
}
