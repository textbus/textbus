import { Matcher, SelectionMatchDelta } from './matcher';
import { TBSelection } from '../../core/selection';
import { Renderer } from '../../core/renderer';
import { Editor } from '../../editor';
import { HighlightState } from '../help';

export class HistoryMatcher implements Matcher {
  constructor(private type: 'forward' | 'back') {
  }

  queryState(selection: TBSelection, renderer: Renderer, editor: Editor): SelectionMatchDelta {
    switch (this.type) {
      case 'back':
        return {
          state: editor.canBack ? HighlightState.Normal : HighlightState.Disabled,
          srcStates: [],
          matchData: null
        };
      case 'forward':
        return {
          state: editor.canForward ? HighlightState.Normal : HighlightState.Disabled,
          srcStates: [],
          matchData: null
        };
    }  }
}
