import { CommonMatchDelta, Matcher, MatchState } from './matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { Editor } from '../editor';

export class HistoryMatcher extends Matcher {
  constructor(private type: 'forward' | 'back') {
    super();
  }

  queryState(selection: TBSelection, handler: Handler, editor: Editor): CommonMatchDelta {
    switch (this.type) {
      case 'back':
        return {
          state: editor.canBack ? MatchState.Normal : MatchState.Disabled,
          srcStates: [],
          abstractData: null
        };
      case 'forward':
        return {
          state: editor.canForward ? MatchState.Normal : MatchState.Disabled,
          srcStates: [],
          abstractData: null
        };
    }
  }
}
