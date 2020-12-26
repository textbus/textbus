import { Type } from '@tanbo/di';

import { TBSelection, BranchAbstractComponent, DivisionAbstractComponent } from '../../core/_api';
import { Matcher, SelectionMatchState } from './matcher';
import { HighlightState } from '../../toolbar/help';
import { rangeContentInComponent } from './utils/range-content-in-component';

export class TableMatcher implements Matcher {
  constructor(private excludeComponents: Array<Type<BranchAbstractComponent | DivisionAbstractComponent>> = []) {
  }

  queryState(selection: TBSelection): SelectionMatchState {
    for (const range of selection.ranges) {
      const isDisable = rangeContentInComponent(range, this.excludeComponents);

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
