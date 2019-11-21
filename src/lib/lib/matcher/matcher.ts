import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';
import { Fragment } from '../parser/fragment';
import { TBRange } from '../selection/range';
import { CacheData } from '../toolbar/utils/cache-data';
import { Priority } from '../toolbar/help';

interface MatchData {
  state: FormatState;
  cacheData: CacheData;
}

export enum FormatState {
  Valid = 'Valid',
  Invalid = 'Invalid',
  Exclude = 'Exclude'
}

export interface MatchDelta {
  overlap: boolean;
  fromRange: TBRange;
  cacheData: CacheData;
}

export interface CommonMatchDelta {
  overlap: boolean;
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
}

export class Matcher {
  private validators: Array<(node: Node) => boolean> = [];
  private excludeValidators: Array<(node: Node) => boolean> = [];

  constructor(private rule: MatchRule = {}) {
    if (rule.tags) {
      this.validators.push(node => {
        if (node.nodeType === 1) {
          const tagName = (node as HTMLElement).tagName.toLowerCase();
          return Array.isArray(rule.tags) ? rule.tags.includes(tagName) : rule.tags.test(tagName);
        }
        return false;
      });
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

  matchNode(node: Node): FormatState {
    const exclude = this.excludeValidators.map(fn => fn(node)).includes(true);
    if (exclude) {
      return FormatState.Exclude;
    }
    return this.validators.map(fn => fn(node)).includes(true) ? FormatState.Valid : FormatState.Invalid;
  }

  queryState(selection: TBSelection, handler: Handler): CommonMatchDelta {
    const srcStates: MatchDelta[] = selection.ranges.map(range => {
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

      let state = Matcher.mergeStates(states);
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
        overlap,
        fromRange: range,
        cacheData: state.cacheData
      };
    });
    return {
      overlap: srcStates.reduce((v, n) => v && n.overlap, true),
      srcStates,
      cacheData: srcStates[0].cacheData
    }
  }

  private getStatesByRange(startIndex: number, endIndex: number, fragment: Fragment, handler: Handler): MatchData {
    const formatRanges = fragment.formatMatrix.get(handler) || [];
    const childContents = fragment.contents.slice(startIndex, endIndex);

    if (startIndex === endIndex) {
      for (const format of formatRanges) {
        // 如果为块级元素，则需要从第 0 位开始匹配，否则从第一位
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
        if (startIndex > format.startIndex && startIndex <= format.endIndex) {
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
          }
        }
      } else if (child instanceof Fragment) {
        states.push(this.getStatesByRange(0, child.contents.length, child, handler));
      }
    }
    return Matcher.mergeStates(states);
  }

  private makeAttrsMatcher(attrs: Array<{ key: string; value?: string | string[] }>) {
    return (node: Node) => {
      if (node.nodeType === 1) {
        return attrs.map(attr => {
          if (attr.value) {
            return (node as HTMLElement).getAttribute(attr.key) === attr.value;
          }
          return (node as HTMLElement).hasAttribute(attr.key);
        }).includes(true);
      }
      return false;
    }
  }

  private makeClassNameMatcher(classes: string[]) {
    return (node: Node) => {
      if (node.nodeType === 1) {
        return classes.map(className => {
          return (node as HTMLElement).classList.contains(className);
        }).includes(true);
      }
      return false;
    };
  }

  private makeStyleMatcher(styles: { [key: string]: number | string | RegExp | Array<number | string | RegExp> }) {
    return (node: Node) => {
      if (node.nodeType === 1) {
        const elementStyles = (node as HTMLElement).style;
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
    } : {
      state: FormatState.Invalid,
      cacheData: null
    };
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
