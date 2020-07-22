import { FormatMatcher } from './format.matcher';
import { SelectionMatchDelta } from './matcher';
import { Renderer, TBSelection } from '../../core/_api';
import { HighlightState } from '../../toolbar/help';

export class UnlinkMatcher extends FormatMatcher {
  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    const r = super.queryState(selection, renderer);
    if (r.state === HighlightState.Normal) {
      r.state = HighlightState.Disabled;
    }
    return r;
  }
}
