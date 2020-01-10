import { CommonMatchDelta, Matcher, MatchState } from './matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';

export class HistoryMatcher extends Matcher {
  constructor(private type: 'forward' | 'back') {
    super();
  }

  queryState(selection: TBSelection, handler: Handler): CommonMatchDelta {
    switch (this.type) {
      case 'back':
        return {
          state: handler.context.canBack ? MatchState.Normal : MatchState.Disabled,
          srcStates: [],
          abstractData: null
        };
      case 'forward':
        return {
          state: handler.context.canForward ? MatchState.Normal : MatchState.Disabled,
          srcStates: [],
          abstractData: null
        };
    }
  }
}
