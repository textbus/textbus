import { Matcher, SelectionMatchState } from './matcher';
import { TBSelection } from '../../core/_api';
import { HighlightState } from '../help';
import { HistoryManager } from '../../history-manager';

export class HistoryMatcher implements Matcher {
  constructor(private type: 'forward' | 'back') {
  }

  queryState(selection: TBSelection, history: HistoryManager): SelectionMatchState {
    switch (this.type) {
      case 'back':
        return {
          state: history.canBack ? HighlightState.Normal : HighlightState.Disabled,
          srcStates: [],
          matchData: null
        };
      case 'forward':
        return {
          state: history.canForward ? HighlightState.Normal : HighlightState.Disabled,
          srcStates: [],
          matchData: null
        };
    }
  }
}
