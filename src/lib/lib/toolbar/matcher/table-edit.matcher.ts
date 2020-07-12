import { TBSelection, Renderer } from '../../core/_api';
import { Matcher, SelectionMatchDelta } from './matcher';
import { HighlightState } from '../../toolbar/help';
import { rangeContentInTemplate } from './utils/range-content-in-template';
import { TableTemplate } from '../../templates/table.template';

export class TableEditMatcher implements Matcher {

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    for (const range of selection.ranges) {
      let has = rangeContentInTemplate(range, renderer, [TableTemplate]);
      if (!has) {
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
