import { Matcher, RangeMatchDelta, SelectionMatchDelta } from './matcher';
import { Constructor, EndTemplate, Renderer, TBSelection } from '../../core/_api';
import { HighlightState } from '../help';

export class MediaMatcher implements Matcher {
  constructor(public templateConstructor: Constructor<EndTemplate>, public tagName: string) {
  }

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    const states: RangeMatchDelta<EndTemplate>[] = selection.ranges.map(range => {
      let template: EndTemplate;
      if (range.commonAncestorTemplate instanceof this.templateConstructor) {
        template = range.commonAncestorTemplate;
      } else {
        template = renderer.getContext(range.commonAncestorFragment, this.templateConstructor)
      }
      if (template && template.tagName === this.tagName) {
        return {
          srcData: template,
          fromRange: range,
          state: HighlightState.Highlight
        };
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
      state: HighlightState.Normal,
      srcStates: states,
      matchData: null
    }
  }
}
