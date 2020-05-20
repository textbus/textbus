import { Matcher, SelectionMatchDelta } from './matcher';
import { TBSelection } from '../../viewer/selection';
import { Renderer } from '../../core/renderer';

export class ListMatcher implements Matcher {
  constructor(private tagName: 'ul' | 'ol') {
  }

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    return
  }
}
