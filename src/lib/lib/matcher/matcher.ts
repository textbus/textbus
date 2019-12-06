import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';
import { Fragment } from '../parser/fragment';
import { TBRange } from '../selection/range';
import { CacheData } from '../toolbar/utils/cache-data';
import { Priority } from '../toolbar/help';
import { Single } from '../parser/single';

interface MatchData {
  state: FormatState;
  cacheData: CacheData;
}

export enum MatchState {
  Highlight = 'Highlight',
  Normal = 'Normal',
  Disabled = 'Disabled'
}

export enum FormatState {
  Valid = 'Valid',
  Invalid = 'Invalid',
  Exclude = 'Exclude'
}

export interface MatchDelta {
  state: MatchState;
  fromRange: TBRange;
  cacheData: CacheData;
}

export interface CommonMatchDelta {
  state: MatchState;
  srcStates: MatchDelta[];
  cacheData: CacheData;
}

export interface MatchRule {
  tags?: string[] | RegExp;
  styles?: { [key: string]: number | string | RegExp | Array<number | string | RegExp> };
  classes?: string[];
  attrs?: Array<{ key: string; value?: string | string[] }>;
  excludeStyles?: { [key: string]: number | string | RegExp | Array<number | string | RegExp> };
  excludeClasses?: string[];
  excludeAttrs?: Array<{ key: string; value?: string | string[] }>;
  noContainTags?: string[] | RegExp;
  noInTags?: string[] | RegExp;
}

export class Matcher {
  private validators: Array<(node: HTMLElement) => boolean> = [];
  private excludeValidators: Array<(node: HTMLElement) => boolean> = [];

  constructor(private rule: MatchRule = {}) {
    if (rule.tags) {
      this.validators.push(this.makeTagsMatcher(rule.tags));
    }
    if (rule.classes) {
      this.validators.push(this.makeClassNameMatcher(rule.classes));
    }
    if (rule.styles) {
      this.validators.push(this.makeStyleMatcher(rule.styles));
    }
    if (rule.attrs) {
      this.validators.push(this.makeAttrsMatcher(rule.attrs));
    }

    if (rule.excludeClasses) {
      this.excludeValidators.push(this.makeClassNameMatcher(rule.excludeClasses));
    }
    if (rule.excludeStyles) {
      this.excludeValidators.push(this.makeStyleMatcher(rule.excludeStyles));
    }
    if (rule.excludeAttrs) {
      this.excludeValidators.push(this.makeAttrsMatcher(rule.excludeAttrs));
    }
  }

  matchNode(node: HTMLElement): FormatState {
    const exclude = this.excludeValidators.map(fn => fn(node)).includes(true);
    if (exclude) {
      return FormatState.Exclude;
    }
    return this.validators.map(fn => fn(node)).includes(true) ? FormatState.Valid : FormatState.Invalid;
  }

  queryState(selection: TBSelection, handler: Handler): CommonMatchDelta {
    if (!selection.rangeCount) {
      return {
        srcStates: [],
        state: MatchState.Normal,
        cacheData: null
      };
    }
    const srcStates: MatchDelta[] = selection.ranges.map(range => {

      const isDisable = this.getDisableStateByRange(range);

      if (isDisable) {
        return {
          state: MatchState.Disabled,
          fromRange: range,
          cacheData: null
        };
      }

      const states: MatchData[] = [];
      range.getSelectedScope().forEach(s => {
        if (s.startIndex === s.endIndex) {
          const matchData = this.getStatesByRange(s.startIndex,
            s.endIndex,
            s.context,
            handler);
          if (matchData.state !== FormatState.Invalid) {
            states.push(matchData);
          }
        } else {
          states.push(this.getStatesByRange(s.startIndex,
            s.endIndex,
            s.context,
            handler));
        }
      });
      let state = Matcher.mergeStates(states) || {state: FormatState.Invalid, cacheData: null};
      let overlap: boolean;
      switch (state.state) {
        case FormatState.Exclude:
          overlap = false;
          break;
        case FormatState.Valid:
          overlap = true;
          break;
        case FormatState.Invalid:
          overlap = Matcher.inSingleContainer(range.commonAncestorFragment.parent, handler);
          break;
      }

      return {
        state: overlap ? MatchState.Highlight : MatchState.Normal,
        fromRange: range,
        cacheData: state.cacheData
      };
    });
    let isDisable = false;

    for (const i of srcStates) {
      if (i.state === MatchState.Disabled) {
        isDisable = true;
        break;
      }
    }

    return {
      state: isDisable ? MatchState.Disabled :
        srcStates.reduce((v, n) => v && n.state === MatchState.Highlight, true) ?
          MatchState.Highlight :
          MatchState.Normal,
      srcStates,
      cacheData: srcStates[0].cacheData
    }
  }

  private getDisableStateByRange(range: TBRange) {
    return this.isInTag(range.commonAncestorFragment) ||
      this.isContainTag(range.commonAncestorFragment, range.getCommonAncestorFragmentScope());
  }

  private isInTag(fragment: Fragment): boolean {
    if (!fragment) {
      return false;
    }
    return this.isDisable(fragment, this.rule.noInTags) || this.isInTag(fragment.parent);
  }

  private isContainTag(fragment: Fragment, position: { startIndex: number, endIndex: number }): boolean {
    const elements = fragment.contents.slice(position.startIndex, position.endIndex)
      .filter(item => item instanceof Fragment) as Fragment[];
    for (let el of elements) {
      if (this.isDisable(el, this.rule.noContainTags) ||
        this.isContainTag(el, {startIndex: 0, endIndex: el.contents.length})) {
        return true;
      }
    }
    return false;
  }

  private isDisable(fragment: Fragment, tags: string[] | RegExp) {
    const formats = Array.from(fragment.formatMatrix.values())
      .reduce((v, n) => v.concat(n), [])
      .filter(item => [Priority.Default, Priority.Block].includes(item.handler.priority));

    for (const f of formats) {
      if (f.cacheData) {
        if (Array.isArray(tags)) {
          if (tags.includes(f.cacheData.tag)) {
            return true;
          }
        } else if (tags instanceof RegExp) {
          if (tags.test(f.cacheData.tag)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private getStatesByRange(startIndex: number, endIndex: number, fragment: Fragment, handler: Handler): MatchData {
    const formatRanges = fragment.formatMatrix.get(handler) || [];
    if (startIndex === endIndex) {
      for (const format of formatRanges) {
        // 如果为块级元素，则需要从第 0 位开始匹配
        if (format.startIndex === 0 &&
          format.endIndex === fragment.contents.length &&
          (format.handler.priority === Priority.Block || format.handler.priority === Priority.BlockStyle)) {
          if (startIndex >= format.startIndex && startIndex <= format.endIndex) {
            return {
              state: format.state,
              cacheData: format.cacheData ? format.cacheData.clone() : null
            };
          }
        }
        if ((startIndex === 0 && startIndex === format.startIndex) || (startIndex > format.startIndex && startIndex <= format.endIndex)) {
          return {
            state: format.state,
            cacheData: format.cacheData ? format.cacheData.clone() : null
          };
        }
      }
      return {
        state: FormatState.Invalid,
        cacheData: null
      };
    }

    const childContents = fragment.contents.slice(startIndex, endIndex);
    const states: Array<MatchData> = [];
    let index = startIndex;
    for (const child of childContents) {
      if (typeof child === 'string') {
        for (const format of formatRanges) {
          if (index >= format.startIndex && index + child.length <= format.endIndex) {
            if (format.state === FormatState.Exclude) {
              return {
                state: FormatState.Exclude,
                cacheData: format.cacheData ? format.cacheData.clone() : null
              };
            } else {
              states.push({
                state: format.state,
                cacheData: format.cacheData ? format.cacheData.clone() : null
              });
            }
          } else {
            states.push({
              state: FormatState.Invalid,
              cacheData: null
            })
          }
        }
        if (!formatRanges.length) {
          return {
            state: FormatState.Invalid,
            cacheData: null
          };
        }
      } else if (child instanceof Fragment) {
        if (child.contents.length) {
          states.push(this.getStatesByRange(0, child.contents.length, child, handler));
        }
      } else if (child instanceof Single) {
        const formats = child.formatMatrix.get(handler);
        if (formats && formats[0]) {
          return {
            state: formats[0].state,
            cacheData: formats[0].cacheData
          };
        }
      }
      index += child.length;
    }
    return Matcher.mergeStates(states);
  }

  private makeTagsMatcher(tags: string[] | RegExp) {
    return (node: HTMLElement) => {
      if (node.nodeType === 1) {
        const tagName = node.tagName.toLowerCase();
        return Array.isArray(tags) ? tags.includes(tagName) : tags.test(tagName);
      }
      return false;
    };
  }

  private makeAttrsMatcher(attrs: Array<{ key: string; value?: string | string[] }>) {
    return (node: HTMLElement) => {
      return attrs.map(attr => {
        if (attr.value) {
          return node.getAttribute(attr.key) === attr.value;
        }
        return node.hasAttribute(attr.key);
      }).includes(true);
    }
  }

  private makeClassNameMatcher(classes: string[]) {
    return (node: HTMLElement) => {
      return classes.map(className => {
        return node.classList.contains(className);
      }).includes(true);
    };
  }

  private makeStyleMatcher(styles: { [key: string]: number | string | RegExp | Array<number | string | RegExp> }) {
    return (node: HTMLElement) => {
      if (node.nodeType === 1) {
        const elementStyles = node.style;
        return !Object.keys(styles).map(key => {
          const optionValue = (Array.isArray(styles[key]) ?
            styles[key] :
            [styles[key]]) as Array<string | number | RegExp>;
          let styleValue = elementStyles[key];
          if (key === 'fontFamily' && typeof styleValue === 'string') {
            styleValue = styleValue.replace(/['"]/g, '');
          }
          return optionValue.map(v => {
            if (v instanceof RegExp) {
              return v.test(styleValue);
            }
            return v === styleValue;
          }).includes(true);
        }).includes(false);
      }
      return false;
    }
  }

  private static mergeStates(states: MatchData[]): MatchData {
    states = states.filter(i => i);
    for (const item of states) {
      if (item.state === FormatState.Exclude) {
        return {
          state: FormatState.Exclude,
          cacheData: item.cacheData ? item.cacheData.clone() : null
        };
      } else if (item.state === FormatState.Invalid) {
        return {
          state: FormatState.Invalid,
          cacheData: item.cacheData ? item.cacheData.clone() : null
        };
      }
    }
    const last = states[states.length - 1];

    return states.length ? {
      state: FormatState.Valid,
      cacheData: last.cacheData ? last.cacheData.clone() : null
    } : null;
  }

  private static inSingleContainer(fragment: Fragment,
                                   handler: Handler): boolean {

    while (fragment && fragment.parent) {
      let startIndex = Array.from(fragment.parent.contents).indexOf(fragment);
      let endIndex = startIndex + 1;

      const formatRanges = fragment.formatMatrix.get(handler) || [];
      const states: FormatState[] = [];
      for (const f of formatRanges) {
        if (startIndex >= f.startIndex || endIndex <= f.endIndex) {
          states.push(f.state);
        }
      }
      if (states.includes(FormatState.Exclude)) {
        return false;
      } else if (states.includes(FormatState.Valid)) {
        return true;
      } else {
        fragment = fragment.parent;
      }
    }
    return false;
  }
}
