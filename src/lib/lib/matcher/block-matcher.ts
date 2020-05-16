import { Constructor, Matcher, SelectionMatchDelta } from './matcher';
import { TBSelection } from '../viewer/selection';
import { BlockTemplate } from '../templates/block';
import { Renderer } from '../core/renderer';

export class BlockMatcher implements Matcher {
  constructor(public templateConstructor: Constructor<BlockTemplate>) {
  }

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    return
  }
}
