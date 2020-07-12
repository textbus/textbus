import { TBSelection, Constructor, Renderer, BackboneTemplate, BranchTemplate } from '../../core/_api';
import { Matcher, SelectionMatchDelta } from './matcher';
import { HighlightState } from '../../toolbar/help';
import { rangeContentInTemplate } from './utils/range-content-in-template';

export class TableMatcher implements Matcher {
  constructor(private excludeTemplates: Array<Constructor<BackboneTemplate | BranchTemplate>> = []) {
  }

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
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
    return {
      srcStates: [],
      matchData: null,
      state: HighlightState.Normal
    }
  }
}
