import { TBSelection, Constructor, Renderer, BackboneTemplate, BranchTemplate } from '../../core/_api';
import { Matcher, SelectionMatchDelta } from './matcher';
import { BlockTemplate } from '../../templates/block.template';
import { HighlightState } from '../help';
import { rangeContentInTemplate } from './utils/range-content-in-template';

export class BlockMatcher implements Matcher {
  constructor(public templateConstructor: Constructor<BlockTemplate>,
              private tagNames: string[],
              private excludeTemplates: Array<Constructor<BackboneTemplate | BranchTemplate>> = []) {
  }

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    if (selection.rangeCount === 0) {
      return {
        srcStates: [],
        matchData: null,
        state: HighlightState.Normal
      }
    }

    for (const range of selection.ranges) {
      let isDisable = rangeContentInTemplate(range, renderer, this.excludeTemplates);

      if (isDisable) {
        return {
          state: HighlightState.Disabled,
          matchData: null,
          srcStates: []
        };
      }
    }

    const contextTemplates = selection.ranges.map(range => {
      if (range.commonAncestorTemplate instanceof this.templateConstructor &&
        this.tagNames.includes(range.commonAncestorTemplate.tagName)) {
        return range.commonAncestorTemplate;
      }
      return renderer.getContext(range.commonAncestorFragment, this.templateConstructor, instance => {
        return this.tagNames.includes(instance.tagName);
      });
    });
    return {
      state: contextTemplates.map(i => !!i).includes(false) && contextTemplates.length ? HighlightState.Normal : HighlightState.Highlight,
      srcStates: [],
      matchData: contextTemplates[0]
    }
  }
}
