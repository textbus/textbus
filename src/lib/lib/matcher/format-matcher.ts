import { TBSelection } from '../viewer/selection';
import { Renderer } from '../core/renderer';
import { HighlightState } from '../toolbar/help';
import { Fragment } from '../core/fragment';
import { TBRange } from '../viewer/range';
import { Template } from '../core/template';
import { FormatRange, Formatter, MatchState } from '../core/formatter';
import { MatchData, Matcher, RangeMatchDelta, SelectionMatchDelta } from './matcher';

export interface FormatMatcherParams {
  /** 不能包含哪些标签 */
  noContainTags?: string[] | RegExp;
  /** 不能在哪些标签之内 */
  noInTags?: string[] | RegExp;
}

export class FormatMatcher implements Matcher {
  constructor(private formatter: Formatter, private rule: FormatMatcherParams = {}) {
  }

  queryState(selection: TBSelection, renderer: Renderer): SelectionMatchDelta {
    if (!selection.rangeCount) {
      return {
        srcStates: [],
        state: HighlightState.Normal,
        abstractData: null
      };
    }
    const srcStates: RangeMatchDelta[] = selection.ranges.map(range => {

      const isDisable = this.getDisableStateByRange(range, renderer);

      if (isDisable) {
        return {
          state: HighlightState.Disabled,
          fromRange: range,
          abstractData: null
        };
      }

      const states: MatchData[] = [];
      range.getSelectedScope().forEach(s => {
        const state = this.getStatesByRange(s.fragment, this.formatter, s.startIndex, s.endIndex);
        if (state.state === MatchState.Invalid) {
          const inSingleContainer = this.inSingleContainer(renderer, s.fragment, this.formatter, s.startIndex, s.endIndex);
          if (inSingleContainer.state !== MatchState.Invalid) {
            states.push(inSingleContainer);
          } else {
            states.push(state);
          }
        } else {
          states.push(state);
        }
      });
      let mergedState = FormatMatcher.mergeStates(states) || {state: MatchState.Invalid, abstractData: null};
      return {
        state: (mergedState.state === MatchState.Valid || mergedState.state === MatchState.Inherit) ?
          HighlightState.Highlight : HighlightState.Normal,
        fromRange: range,
        abstractData: mergedState.abstractData
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
      abstractData: srcStates[0].abstractData
    };
  }

  private getStatesByRange(fragment: Fragment, formatter: Formatter, startIndex: number, endIndex: number): MatchData {
    let formatRanges = fragment.getFormatRangesByFormatter(formatter) || [];

    if (startIndex === endIndex) {
      for (const format of formatRanges) {
        const matchBegin = startIndex === 0 ? startIndex >= format.startIndex : startIndex > format.startIndex;
        const matchClose = endIndex < format.endIndex;
        if (matchBegin && matchClose) {
          return {
            state: format.state,
            abstractData: format?.abstractData.clone() || null
          };
        }
      }
      return {
        state: MatchState.Invalid,
        abstractData: null
      };
    }

    const childContents = fragment.sliceContents(startIndex, endIndex);
    const states: Array<MatchData> = [];
    let index = startIndex;
    formatRanges = formatRanges.filter(item => {
      return !(item.endIndex <= startIndex || item.startIndex >= endIndex);
    });

    for (const child of childContents) {
      if (typeof child === 'string') {
        for (const format of formatRanges) {
          if (index >= format.startIndex && index + child.length <= format.endIndex) {
            if (format.state === MatchState.Exclude) {
              return {
                state: MatchState.Exclude,
                abstractData: format?.abstractData.clone() || null
              };
            } else {
              states.push({
                state: format.state,
                abstractData: format?.abstractData.clone() || null
              });
            }
          } else {
            states.push({
              state: MatchState.Invalid,
              abstractData: null
            })
          }
        }
        if (!formatRanges.length) {
          return {
            state: MatchState.Invalid,
            abstractData: null
          };
        }
      } else if (child instanceof Fragment) {
        if (child.contentLength) {
          states.push(this.getStatesByRange(child, this.formatter, 0, child.contentLength));
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
    return this.isDisable(fragment, this.rule.noInTags) || this.isInTag(
      renderer.getParentFragmentByTemplate(renderer.getParentTemplateByFragment(fragment)),
      renderer
    );
  }

  private isContainTag(fragment: Fragment, renderer: Renderer, position: { startIndex: number, endIndex: number }): boolean {
    const templates: Template[] = fragment.sliceContents(position.startIndex, position.endIndex)
      .filter(item => item instanceof Template) as Template[];
    const elements: Fragment[] = [];
    templates.forEach(t => {
      elements.push(...t.childSlots);
    });
    for (let el of elements) {
      if (this.isDisable(el, this.rule.noContainTags) ||
        this.isContainTag(el, renderer, {startIndex: 0, endIndex: el.contentLength})) {
        return true;
      }
    }
    return false;
  }

  private isDisable(fragment: Fragment, tags: string[] | RegExp) {
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



  private inSingleContainer(renderer: Renderer, fragment: Fragment, formatter: Formatter, startIndex: number, endIndex: number): MatchData {

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
        if (item.state === MatchState.Exclude) {
          return {
            state: MatchState.Exclude,
            abstractData: item.abstractData.clone()
          }
        }
      }
      for (const item of states) {
        if (item.state === MatchState.Valid) {
          return {
            state: MatchState.Valid,
            abstractData: item.abstractData.clone()
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
      state: MatchState.Invalid,
      abstractData: null
    };
  }

  private static mergeStates(states: MatchData[]): MatchData {
    states = states.filter(i => i);
    for (const item of states) {
      if (item.state === MatchState.Exclude) {
        return {
          state: MatchState.Exclude,
          abstractData: item.abstractData ? item.abstractData.clone() : null
        };
      } else if (item.state === MatchState.Invalid) {
        return {
          state: MatchState.Invalid,
          abstractData: item.abstractData ? item.abstractData.clone() : null
        };
      }
    }

    const last = states[states.length - 1];
    let equal = true;
    for (let i = 1; i < states.length; i++) {
      const b = states[0].abstractData.equal(states[i].abstractData);
      if (!b) {
        equal = false;
        break;
      }
    }

    return states.length ? {
      state: last.state,
      abstractData: states.length && equal ? last.abstractData.clone() : null
    } : null;
  }
}
