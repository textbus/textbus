import {
  TBSelection,
  Renderer,
  Fragment,
  TBRange,
  BackboneTemplate,
  FormatAbstractData,
  FormatRange,
  InlineFormatter,
  FormatEffect,
  BlockFormatter
} from '../../core/_api';
import { HighlightState } from '../help';
import { FormatMatchData, Matcher, RangeMatchDelta, SelectionMatchDelta } from './matcher';

export interface FormatMatcherParams {
  /** 不能包含哪些标签 */
  noContainTags?: string[] | RegExp;
  /** 不能在哪些标签之内 */
  noInTags?: string[] | RegExp;
}

export class FormatMatcher implements Matcher {
  constructor(private formatter: InlineFormatter | BlockFormatter, private rule: FormatMatcherParams = {}) {
  }

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    if (!selection.rangeCount) {
      return {
        srcStates: [],
        state: HighlightState.Normal,
        matchData: null
      };
    }
    const srcStates: RangeMatchDelta<FormatAbstractData>[] = selection.ranges.map(range => {

      const isDisable = this.getDisableStateByRange(range, renderer);

      if (isDisable) {
        return {
          state: HighlightState.Disabled,
          fromRange: range,
          srcData: null
        };
      }

      const states: FormatMatchData[] = [];
      range.getSelectedScope().forEach(s => {
        const state = this.getStatesByRange(s.fragment, this.formatter, s.startIndex, s.endIndex);
        if (state.effect === FormatEffect.Invalid) {
          const inSingleContainer = FormatMatcher.inSingleContainer(renderer, s.fragment, this.formatter, s.startIndex, s.endIndex);
          if (inSingleContainer.effect !== FormatEffect.Invalid) {
            states.push(inSingleContainer);
          } else {
            states.push(state);
          }
        } else {
          states.push(state);
        }
      });
      let mergedState = FormatMatcher.mergeStates(states) || {effect: FormatEffect.Invalid, srcData: null};
      return {
        state: (mergedState.effect === FormatEffect.Valid || mergedState.effect === FormatEffect.Inherit) ?
          HighlightState.Highlight : HighlightState.Normal,
        fromRange: range,
        srcData: mergedState.srcData
      };
    });
    let isDisable = false;
    for (const i of srcStates) {
      if (i.state === HighlightState.Disabled) {
        isDisable = true;
        break;
      }
    }

    return {
      state: isDisable ? HighlightState.Disabled :
        srcStates.reduce((v, n) => v && n.state === HighlightState.Highlight, true) ?
          HighlightState.Highlight :
          HighlightState.Normal,
      srcStates,
      matchData: srcStates[0].srcData
    };
  }

  private getStatesByRange(fragment: Fragment, formatter: InlineFormatter | BlockFormatter, startIndex: number, endIndex: number): FormatMatchData {
    let formatRanges = fragment.getFormatRangesByFormatter(formatter) || [];
    if (startIndex === endIndex) {
      for (const format of formatRanges) {
        const matchBegin = startIndex === 0 ? startIndex >= format.startIndex : startIndex > format.startIndex;
        const matchClose = endIndex < format.endIndex;
        if (matchBegin && matchClose) {
          return {
            effect: format.state,
            srcData: format?.abstractData.clone() || null
          };
        }
      }
      return {
        effect: FormatEffect.Invalid,
        srcData: null
      };
    }

    const childContents = fragment.sliceContents(startIndex, endIndex);
    const states: Array<FormatMatchData> = [];
    let index = startIndex;
    formatRanges = formatRanges.filter(item => {
      return !(item.endIndex <= startIndex || item.startIndex >= endIndex);
    });

    for (const child of childContents) {
      if (child instanceof BackboneTemplate) {
        child.childSlots.forEach(childFragment => {
          states.push(this.getStatesByRange(childFragment, this.formatter, 0, childFragment.contentLength));
        })
      } else {
        for (const format of formatRanges) {
          if (index >= format.startIndex && index + child.length <= format.endIndex) {
            if (format.state === FormatEffect.Exclude) {
              return {
                effect: FormatEffect.Exclude,
                srcData: format?.abstractData.clone() || null
              };
            } else {
              states.push({
                effect: format.state,
                srcData: format?.abstractData.clone() || null
              });
            }
          } else {
            states.push({
              effect: FormatEffect.Invalid,
              srcData: null
            })
          }
        }
        if (!formatRanges.length) {
          return {
            effect: FormatEffect.Invalid,
            srcData: null
          };
        }
      }
      index += child.length;
    }
    return FormatMatcher.mergeStates(states);
  }

  private getDisableStateByRange(range: TBRange, renderer: Renderer) {
    return this.isInTag(range.commonAncestorFragment, renderer) ||
      this.isContainTag(range.commonAncestorFragment, renderer, range.getCommonAncestorFragmentScope());
  }

  private isInTag(fragment: Fragment, renderer: Renderer): boolean {
    if (!fragment) {
      return false;
    }
    return FormatMatcher.isDisable(fragment, this.rule.noInTags) || this.isInTag(
      renderer.getParentFragmentByTemplate(renderer.getParentTemplateByFragment(fragment)),
      renderer
    );
  }

  private isContainTag(fragment: Fragment, renderer: Renderer, position: { startIndex: number, endIndex: number }): boolean {
    const templates: BackboneTemplate[] = fragment.sliceContents(position.startIndex, position.endIndex)
      .filter(item => item instanceof BackboneTemplate) as BackboneTemplate[];
    const elements: Fragment[] = [];
    templates.forEach(t => {
      elements.push(...t.childSlots);
    });
    for (let el of elements) {
      if (FormatMatcher.isDisable(el, this.rule.noContainTags) ||
        this.isContainTag(el, renderer, {startIndex: 0, endIndex: el.contentLength})) {
        return true;
      }
    }
    return false;
  }

  private static isDisable(fragment: Fragment, tags: string[] | RegExp) {
    const formats = fragment.getFormatRanges();

    for (const f of formats) {
      if (f.abstractData) {
        if (Array.isArray(tags)) {
          if (tags.includes(f.abstractData.tag)) {
            return true;
          }
        } else if (tags instanceof RegExp) {
          if (tags.test(f.abstractData.tag)) {
            return true;
          }
        }
      }
    }
    return false;
  }


  private static inSingleContainer(renderer: Renderer, fragment: Fragment, formatter: InlineFormatter, startIndex: number, endIndex: number): FormatMatchData {

    while (true) {
      const formatRanges = fragment.getFormatRangesByFormatter(formatter) || [];
      const states: FormatRange[] = [];
      for (const f of formatRanges) {
        if (startIndex === endIndex && f.startIndex === f.endIndex && startIndex === f.startIndex) {
          states.push(f);
        } else {
          const matchBegin = startIndex === 0 ?
            startIndex >= f.startIndex :
            startIndex > f.startIndex;
          const matchClose = endIndex <= f.endIndex;
          if (matchBegin && matchClose) {
            states.push(f);
          }
        }
      }

      for (const item of states) {
        if (item.state === FormatEffect.Exclude) {
          return {
            effect: FormatEffect.Exclude,
            srcData: item.abstractData.clone()
          }
        }
      }
      for (const item of states) {
        if (item.state === FormatEffect.Valid) {
          return {
            effect: FormatEffect.Valid,
            srcData: item.abstractData.clone()
          }
        }
      }

      const parentTemplate = renderer.getParentTemplateByFragment(fragment);
      const parentFragment = renderer.getParentFragmentByTemplate(parentTemplate);
      if (parentFragment) {
        startIndex = parentFragment.sliceContents(0).indexOf(parentTemplate);
        endIndex = startIndex + 1;
        fragment = parentFragment;
      } else {
        break;
      }
    }
    return {
      effect: FormatEffect.Invalid,
      srcData: null
    };
  }

  private static mergeStates(states: FormatMatchData[]): FormatMatchData {
    states = states.filter(i => i);
    for (const item of states) {
      if (item.effect === FormatEffect.Exclude) {
        return {
          effect: FormatEffect.Exclude,
          srcData: item.srcData ? item.srcData.clone() : null
        };
      } else if (item.effect === FormatEffect.Invalid) {
        return {
          effect: FormatEffect.Invalid,
          srcData: item.srcData ? item.srcData.clone() : null
        };
      }
    }

    const last = states[states.length - 1];
    let equal = true;
    for (let i = 1; i < states.length; i++) {
      const b = states[0].srcData.equal(states[i].srcData);
      if (!b) {
        equal = false;
        break;
      }
    }

    return states.length ? {
      effect: last.effect,
      srcData: states.length && equal ? last.srcData.clone() : null
    } : null;
  }
}
