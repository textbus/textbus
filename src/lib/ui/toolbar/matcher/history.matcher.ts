import { Injector } from '@tanbo/di';

import { Matcher, SelectionMatchState } from './matcher';
import { HighlightState } from '../help';
import { HistoryManager } from '../../../history-manager';

export class HistoryMatcher implements Matcher {
  private history: HistoryManager;

  constructor(private type: 'forward' | 'back') {
  }

  setup(injector: Injector) {
    this.history = injector.get(HistoryManager);
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
