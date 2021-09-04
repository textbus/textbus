import {
  Type,
  TBSelection,
  BranchAbstractComponent,
  DivisionAbstractComponent,
  BackboneAbstractComponent
} from '@textbus/core';

import { Matcher, SelectionMatchState } from './matcher';
import { HighlightState } from '../help';
import { rangeContentInComponent } from './utils/range-content-in-component';

export class TableMatcher implements Matcher {
  constructor(private excludeComponents: Array<Type<BranchAbstractComponent | BackboneAbstractComponent | DivisionAbstractComponent>> = []) {
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
