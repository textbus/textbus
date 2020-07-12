import { Matcher, RangeMatchDelta, SelectionMatchDelta } from './matcher';
import { BackboneComponent, BranchComponent, Constructor, Renderer, TBSelection } from '../../core/_api';
import { ListComponent } from '../../components/list.component';
import { HighlightState } from '../help';
import { rangeContentInTemplate } from './utils/range-content-in-template';

export class ListMatcher implements Matcher {
  constructor(private tagName: 'ul' | 'ol',
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

    const states = selection.ranges.map<RangeMatchDelta<ListComponent>>(range => {
      if (range.commonAncestorTemplate instanceof ListComponent &&
        range.commonAncestorTemplate.tagName === this.tagName) {
        return {
          srcData: range.commonAncestorTemplate,
          fromRange: range,
          state: HighlightState.Highlight
        }
      }

      const context = renderer.getContext(range.commonAncestorFragment, ListComponent);
      return {
        state: context && context.tagName === this.tagName ? HighlightState.Highlight : HighlightState.Normal,
        srcData: context,
        fromRange: range
      }
    });
    let isHighlight = true;
    for (const item of states) {
      if (item.state === HighlightState.Normal) {
        isHighlight = false;
        break;
      }
    }
    return {
      state: isHighlight ? HighlightState.Highlight : HighlightState.Normal,
      srcStates: states,
      matchData: states[0]?.srcData,
    }
  }
}
