import { Matcher, SelectionMatchDelta } from './matcher';
import { Renderer, TBSelection } from '../../core/_api';
import { Editor } from '../../editor';
import { HighlightState } from '../help';

export class DeviceMatcher implements Matcher {

  queryState(selection: TBSelection, renderer: Renderer, editor: Editor): SelectionMatchDelta {
    return {
      state: editor.device === '100%' ? HighlightState.Normal : HighlightState.Highlight,
      srcStates: [],
      matchData: editor.device as any
    }
  }
}
