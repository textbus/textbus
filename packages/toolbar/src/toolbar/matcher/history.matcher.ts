import { Injector, TBHistory } from '@textbus/core';

import { Matcher, SelectionMatchState } from './matcher';
import { HighlightState } from '../help';

export class HistoryMatcher implements Matcher {
  private history: TBHistory;

  constructor(private type: 'forward' | 'back') {
  }

  setup(injector: Injector) {
    this.history = injector.get(TBHistory);
  }

  queryState(): SelectionMatchState {
    switch (this.type) {
      case 'back':
        return {
          state: this.history.canBack ? HighlightState.Normal : HighlightState.Disabled,
          srcStates: [],
          matchData: null
        };
      case 'forward':
        return {
          state: this.history.canForward ? HighlightState.Normal : HighlightState.Disabled,
          srcStates: [],
          matchData: null
        };
    }
  }
}
