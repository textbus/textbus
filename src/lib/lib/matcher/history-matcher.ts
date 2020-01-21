import { Matcher } from './matcher';
import { TBSelection } from '../viewer/selection';
import { SelectionMatchDelta, Handler } from '../toolbar/handlers/help';
import { Editor } from '../editor';
import { HighlightState } from '../toolbar/help';

export class HistoryMatcher extends Matcher {
  constructor(private type: 'forward' | 'back') {
    super();
  }

  queryState(selection: TBSelection, handler: Handler, editor: Editor): SelectionMatchDelta {
    switch (this.type) {
      case 'back':
        return {
          state: editor.canBack ? HighlightState.Normal : HighlightState.Disabled,
          srcStates: [],
          abstractData: null
        };
      case 'forward':
        return {
          state: editor.canForward ? HighlightState.Normal : HighlightState.Disabled,
          srcStates: [],
          abstractData: null
        };
    }
  }
}
