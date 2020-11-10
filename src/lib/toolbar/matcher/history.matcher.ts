import { Matcher, SelectionMatchState } from './matcher';
import { TBSelection } from '../../core/_api';
import { Editor } from '../../editor';
import { HighlightState } from '../help';

export class HistoryMatcher implements Matcher {
  constructor(private type: 'forward' | 'back') {
  }

  queryState(selection: TBSelection, editor: Editor): SelectionMatchState {
    switch (this.type) {
      case 'back':
        return {
          state: editor.history.canBack ? HighlightState.Normal : HighlightState.Disabled,
          srcStates: [],
          matchData: null
        };
      case 'forward':
        return {
          state: editor.history.canForward ? HighlightState.Normal : HighlightState.Disabled,
          srcStates: [],
          matchData: null
        };
    }
  }
}
