import {
  Type, BackboneAbstractComponent,
  BranchAbstractComponent,
  DivisionAbstractComponent,
  TBSelection
} from '@textbus/core';
import { boldFormatter } from '@textbus/formatters';
import { BlockComponent } from '@textbus/components';

import { FormatMatcher } from './format.matcher';
import { SelectionMatchState } from './matcher';
import { HighlightState } from '../help';
import { BlockMatcher } from './block.matcher';

export class BoldMatcher extends FormatMatcher {
  private contextMatcher = new BlockMatcher(BlockComponent, 'h1,h2,h3,h4,h5,h6'.split(','))

  constructor(excludeComponents: Array<Type<BranchAbstractComponent | BackboneAbstractComponent | DivisionAbstractComponent>> = []) {
    super(boldFormatter, excludeComponents);
  }

  queryState(selection: TBSelection): SelectionMatchState {
    if (selection.rangeCount === 0) {
      return {
        srcStates: [],
        matchData: null,
        state: HighlightState.Normal
      }
    }
    const result = super.queryState(selection);
    if (result.state !== HighlightState.Normal) {
      return result;
    }
    const contextMatchResult = this.contextMatcher.queryState(selection);
    if (contextMatchResult.state === HighlightState.Highlight &&
      /h[1-6]/i.test((contextMatchResult.matchData as BlockComponent)?.tagName)) {
      return {
        ...contextMatchResult,
        state: result.state === HighlightState.Normal ? HighlightState.Normal : HighlightState.Highlight
      };
    }
    return result;
  }
}
