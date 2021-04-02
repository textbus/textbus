import { Type } from '@tanbo/di';

import { Matcher, RangeMatchState, SelectionMatchState } from './matcher';
import {
  BackboneAbstractComponent,
  BranchAbstractComponent,
  DivisionAbstractComponent,
  LeafAbstractComponent, TBRange,
  TBSelection
} from '../../../core/_api';
import { HighlightState } from '../help';
import { rangeContentInComponent } from './utils/range-content-in-component';

export class LeafComponentMatcher implements Matcher {
  constructor(public componentConstructor: Type<LeafAbstractComponent>, public tagName: string,
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

    const states: RangeMatchState<LeafAbstractComponent>[] = selection.ranges.map(range => {
      if (range.startFragment === range.endFragment) {
        if (range.collapsed && range.startIndex > 0) {
          const state = this.match(range, range.startIndex - 1);
          if (state) {
            return state
          }
        } else if (range.endIndex - range.startIndex === 1) {
          const state = this.match(range, range.startIndex);
          if (state) {
            return state
          }
        }
      }

      return {
        state: HighlightState.Normal,
        fromRange: range,
        srcData: null
      };
    });
    for (const s of states) {
      if (s.state !== HighlightState.Highlight) {
        return {
          state: HighlightState.Normal,
          srcStates: states,
          matchData: states[0]?.srcData
        }
      }
    }
    return {
      state: HighlightState.Highlight,
      srcStates: states,
      matchData: states[0]?.srcData
    }
  }

  private match(range: TBRange, startIndex: number): RangeMatchState<LeafAbstractComponent> {
    const content = range.startFragment.getContentAtIndex(startIndex);
    if (content instanceof this.componentConstructor && content.tagName === this.tagName) {
      return {
        srcData: content,
        fromRange: range,
        state: HighlightState.Highlight
      };
    }
    return null;
  }
}
