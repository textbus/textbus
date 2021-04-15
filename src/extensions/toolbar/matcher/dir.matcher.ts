import { Type } from '@tanbo/di';

import { FormatMatcher } from './format.matcher';
import {
  TBSelection,
  FormatData,
  BranchAbstractComponent,
  DivisionAbstractComponent,
  BackboneAbstractComponent
} from '../../../lib/core/_api';
import { SelectionMatchState } from './matcher';
import { HighlightState } from '../help';
import { dirFormatter } from '../../../lib/formatter/dir.formatter';

export class DirMatcher extends FormatMatcher {
  constructor(private dir: 'ltr' | 'rtl',
              excludeComponents: Array<Type<BranchAbstractComponent | DivisionAbstractComponent | BackboneAbstractComponent>> = []) {
    super(dirFormatter, excludeComponents);
  }

  queryState(selection: TBSelection): SelectionMatchState {
    if (selection.rangeCount === 0) {
      return {
        srcStates: [],
        matchData: null,
        state: HighlightState.Normal
      }
    }
    const result = super.queryState(selection);
    if (result.state === HighlightState.Highlight) {
      const matchData = result.matchData as FormatData;
      if (matchData.attrs.get('dir') !== this.dir) {
        result.state = HighlightState.Normal;
      }
    }
    return result;
  }
}
