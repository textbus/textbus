import { Matcher, RangeMatchDelta, SelectionMatchDelta } from './matcher';
import { BackboneComponent, BranchComponent, Constructor, LeafComponent, Renderer, TBSelection } from '../../core/_api';
import { HighlightState } from '../help';
import { rangeContentInTemplate } from './utils/range-content-in-template';

export class MediaMatcher implements Matcher {
  constructor(public templateConstructor: Constructor<LeafComponent>, public tagName: string,
              private excludeTemplates: Array<Constructor<BackboneComponent | BranchComponent>> = []) {
  }

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    if (selection.rangeCount === 0) {
      return {
        srcStates: [],
        matchData: null,
        state: HighlightState.Normal
      }
    }

    for (const range of selection.ranges) {
      let isDisable = rangeContentInTemplate(range, renderer, this.excludeTemplates);
      if (isDisable) {
        return {
          state: HighlightState.Disabled,
          matchData: null,
          srcStates: []
        };
      }
    }

    const states: RangeMatchDelta<LeafComponent>[] = selection.ranges.map(range => {
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
