import { TBSelection } from '@textbus/core';

import { FormatMatcher } from './format.matcher';
import { SelectionMatchState } from './matcher';
import { HighlightState } from '../help';

export class UnlinkMatcher extends FormatMatcher {
  queryState(selection: TBSelection): SelectionMatchState {
    const r = super.queryState(selection);
    if (r.state === HighlightState.Normal) {
      r.state = HighlightState.Disabled;
    }
    return r;
  }
}
