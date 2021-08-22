import {
  Type, TBSelection,
  BranchAbstractComponent,
  DivisionAbstractComponent,
  BackboneAbstractComponent
} from '@textbus/core';
import { BlockComponent } from '@textbus/components';

import { Matcher, SelectionMatchState } from './matcher';
import { HighlightState } from '../help';
import { rangeContentInComponent } from './utils/range-content-in-component';

export class BlockMatcher implements Matcher {
  constructor(public componentConstructor: Type<BlockComponent>,
              private tagNames: string[],
              private excludeComponents: Array<Type<BranchAbstractComponent | BackboneAbstractComponent | DivisionAbstractComponent>> = []) {
  }

  queryState(selection: TBSelection): SelectionMatchState {
    if (selection.rangeCount === 0) {
      return {
        srcStates: [],
        matchData: null,
        state: HighlightState.Normal
      }
    }

    for (const range of selection.ranges) {
      const isDisable = rangeContentInComponent(range, this.excludeComponents);

      if (isDisable) {
        return {
          state: HighlightState.Disabled,
          matchData: null,
          srcStates: []
        };
      }
    }

    const contextComponents = selection.ranges.map(range => {
      if (range.commonAncestorComponent instanceof this.componentConstructor &&
        this.tagNames.includes(range.commonAncestorComponent.tagName)) {
        return range.commonAncestorComponent;
      }
      return range.commonAncestorFragment.getContext(this.componentConstructor, instance => {
        return this.tagNames.includes(instance.tagName);
      });
    });
    return {
      state: contextComponents.map(i => !!i).includes(false) && contextComponents.length ? HighlightState.Normal : HighlightState.Highlight,
      srcStates: [],
      matchData: contextComponents[0]
    }
  }
}
