import { TBSelection, Constructor, Renderer, BranchComponent, DivisionComponent } from '../../core/_api';
import { Matcher, SelectionMatchState } from './matcher';
import { BlockComponent } from '../../components/block.component';
import { HighlightState } from '../help';
import { rangeContentInComponent } from './utils/range-content-in-component';

export class BlockMatcher implements Matcher {
  constructor(public componentConstructor: Constructor<BlockComponent>,
              private tagNames: string[],
              private excludeComponents: Array<Constructor<BranchComponent | DivisionComponent>> = []) {
  }

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchState {
    if (selection.rangeCount === 0) {
      return {
        srcStates: [],
        matchData: null,
        state: HighlightState.Normal
      }
    }

    for (const range of selection.ranges) {
      let isDisable = rangeContentInComponent(range, renderer, this.excludeComponents);

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
      return renderer.getContext(range.commonAncestorFragment, this.componentConstructor, instance => {
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
