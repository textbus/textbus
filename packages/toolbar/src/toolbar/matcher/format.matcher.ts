import {
  Type, BranchAbstractComponent,
  BlockFormatter,
  FormatData,
  FormatEffect,
  FormatRange,
  Fragment,
  InlineFormatter,
  DivisionAbstractComponent,
  TBSelection, BackboneAbstractComponent,
} from '@textbus/core';

import { HighlightState } from '../help';
import { FormatMatchData, Matcher, RangeMatchState, SelectionMatchState } from './matcher';
import { rangeContentInComponent } from './utils/range-content-in-component';

export class FormatMatcher implements Matcher {
  constructor(private formatter: InlineFormatter | BlockFormatter,
              private excludeComponents: Array<Type<BranchAbstractComponent | DivisionAbstractComponent | BackboneAbstractComponent>> = []) {
  }

  queryState(selection: TBSelection): SelectionMatchState {
    if (!selection.rangeCount) {
      return {
        srcStates: [],
        state: HighlightState.Normal,
        matchData: null
      };
    }
    const srcStates: RangeMatchState<FormatData>[] = selection.ranges.map(range => {

      const isDisable = rangeContentInComponent(range, this.excludeComponents);

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
          const inSingleContainer = FormatMatcher.inSingleContainer(s.fragment, this.formatter, s.startIndex, s.endIndex);
          if (inSingleContainer.effect !== FormatEffect.Invalid) {
            states.push(inSingleContainer);
          } else {
            states.push(state);
          }
        } else {
          states.push(state);
        }
      });
      const mergedState = FormatMatcher.mergeStates(states) || {effect: FormatEffect.Invalid, srcData: null};
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

    let formatRanges = fragment.getFormatRanges(formatter) || [];
    if (startIndex === endIndex) {
      for (const format of formatRanges) {
        const matchBegin = startIndex === 0 ? startIndex >= format.startIndex : startIndex > format.startIndex;
        const matchClose = endIndex < format.endIndex;
        if (matchBegin && matchClose) {
          return {
            effect: format.effect,
            srcData: format?.formatData.clone() || null
          };
        }
      }
      return {
        effect: fragment.length === 0 ? null : FormatEffect.Invalid,
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
      if (child instanceof DivisionAbstractComponent) {
        states.push(this.getStatesByRange(child.slot, this.formatter, 0, child.slot.length));
      } else if (child instanceof BranchAbstractComponent) {
        child.slots.forEach(childFragment => {
          states.push(this.getStatesByRange(childFragment, this.formatter, 0, childFragment.length));
        })
      } else {
        for (const format of formatRanges) {
          if (index >= format.startIndex && index + child.length <= format.endIndex) {
            if (format.effect === FormatEffect.Exclude) {
              return {
                effect: FormatEffect.Exclude,
                srcData: format?.formatData.clone() || null
              };
            } else {
              states.push({
                effect: format.effect,
                srcData: format?.formatData.clone() || null
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

  private static inSingleContainer(fragment: Fragment, formatter: InlineFormatter, startIndex: number, endIndex: number): FormatMatchData {
    while (true) {
      const formatRanges = fragment.getFormatRanges(formatter) || [];
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
        if (item.effect === FormatEffect.Exclude) {
          return {
            effect: FormatEffect.Exclude,
            srcData: item.formatData.clone()
          }
        }
      }
      for (const item of states) {
        if (item.effect === FormatEffect.Valid) {
          return {
            effect: FormatEffect.Valid,
            srcData: item.formatData.clone()
          }
        }
      }

      const parentComponent = fragment.parentComponent;
      if (!parentComponent) {
        break;
      }
      const parentFragment = parentComponent.parentFragment;
      if (parentFragment) {
        startIndex = parentFragment.sliceContents(0).indexOf(parentComponent);
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
    states = states.filter(i => i.effect !== null);
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
      const b = states[0].srcData ? states[0].srcData.equal(states[i].srcData) : false;
      if (!b) {
        equal = false;
        break;
      }
    }

    return states.length ? {
      effect: last.effect,
      srcData: states.length && equal ? last.srcData ? last.srcData.clone() : null : null
    } : {
      effect: null,
      srcData: null
    };
  }
}
