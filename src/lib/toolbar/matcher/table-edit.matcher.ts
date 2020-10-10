import { TBSelection, Renderer } from '../../core/_api';
import { Matcher, SelectionMatchState } from './matcher';
import { HighlightState } from '../../toolbar/help';
import { rangeContentInComponent } from './utils/range-content-in-component';
import { TableComponent } from '../../components/table.component';

export class TableEditMatcher implements Matcher {

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchState {
    for (const range of selection.ranges) {
      let has = rangeContentInComponent(range, renderer, [TableComponent]);
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
