import { Matcher, RangeMatchDelta, SelectionMatchDelta } from './matcher';
import { BackboneTemplate, BranchTemplate, Constructor, Renderer, TBSelection } from '../../core/_api';
import { ListTemplate } from '../../templates/list.template';
import { HighlightState } from '../help';
import { rangeContentInTemplate } from './utils/range-content-in-template';

export class ListMatcher implements Matcher {
  constructor(private tagName: 'ul' | 'ol',
              private excludeTemplates: Array<Constructor<BackboneTemplate | BranchTemplate>> = []) {
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

    const states = selection.ranges.map<RangeMatchDelta<ListTemplate>>(range => {
      if (range.commonAncestorTemplate instanceof ListTemplate &&
        range.commonAncestorTemplate.tagName === this.tagName) {
        return {
          srcData: range.commonAncestorTemplate,
          fromRange: range,
          state: HighlightState.Highlight
        }
      }

      const context = renderer.getContext(range.commonAncestorFragment, ListTemplate);
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
