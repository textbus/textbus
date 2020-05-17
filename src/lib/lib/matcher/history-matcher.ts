import { Matcher, SelectionMatchDelta } from './matcher';
import { TBSelection } from '../viewer/selection';
import { Renderer } from '../core/renderer';
import { Editor } from '../editor';

export class HistoryMatcher implements Matcher {
  constructor(private type: 'forward' | 'back') {
  }

  queryState(selection: TBSelection, renderer: Renderer, editor: Editor): SelectionMatchDelta {
    return
  }
}
