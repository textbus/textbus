import { TBSelection, Constructor, Renderer, BranchComponent, DivisionComponent } from '../../core/_api';
import { Matcher, SelectionMatchDelta } from './matcher';
import { HighlightState } from '../../toolbar/help';
import { rangeContentInComponent } from './utils/range-content-in-component';

export class TableMatcher implements Matcher {
  constructor(private excludeComponents: Array<Constructor<BranchComponent | DivisionComponent>> = []) {
  }

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    for (const range of selection.ranges) {
      let isDisable = rangeContentInComponent(range, renderer, this.excludeComponents);

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
