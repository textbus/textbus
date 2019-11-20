import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';
import { Fragment } from '../parser/fragment';
import { TBRange } from '../selection/range';

export enum FormatState {
  Valid = 'Valid',
  Invalid = 'Invalid',
  Exclude = 'Exclude'
}

export interface MatchDelta {
  overlap: boolean;
  fromRange: TBRange;
}

export interface MatchDescription {
  tagName?: string;
  className?: string;
  style?: { key: string; value: string | number };
  attribute?: { key: string; value: string };
}

export interface CommonMatchDelta {
  overlap: boolean;
  srcStates: MatchDelta[];
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
  private validators: Array<(node: Node, desc: MatchDescription) => boolean> = [];
  private excludeValidators: Array<(node: Node, desc: MatchDescription) => boolean> = [];

  constructor(private rule: MatchRule = {}) {
    if (rule.tags) {
      this.validators.push((node, desc) => {
        if (node.nodeType === 1) {
          const tagName = (node as HTMLElement).tagName.toLowerCase();
          const r = Array.isArray(rule.tags) ? rule.tags.includes(tagName) : rule.tags.test(tagName);
          if (r) {
            desc.tagName = tagName;
            return r;
          }
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

  matchNode(node: Node): { state: FormatState, matchDescription: MatchDescription } {
    const excludeMatchDesc = {};
    const matchDesc = {};
    const exclude = this.excludeValidators.map(fn => fn(node, excludeMatchDesc)).includes(true);
    if (exclude) {
      return {
        state: FormatState.Exclude,
        matchDescription: excludeMatchDesc
      };
    }
    const state = this.validators.map(fn => fn(node, matchDesc)).includes(true) ?
      FormatState.Valid :
      FormatState.Invalid;
    return {
      state,
      matchDescription: matchDesc
    };
  }

  queryState(selection: TBSelection, handler: Handler): CommonMatchDelta {
    const srcStates: MatchDelta[] = selection.ranges.map(range => {
      const states: FormatState[] = [];
      range.getSelectedScope().forEach(s => {
        if (s.startIndex === s.endIndex) {
          const state = this.getStatesByRange(s.startIndex,
            s.endIndex,
            s.context,
            handler);
          if (state !== FormatState.Invalid) {
            states.push(state);
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
      switch (state) {
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
        fromRange: range
      };
    });
    return {
      overlap: srcStates.reduce((v, n) => v && n.overlap, true),
      srcStates
    }
  }

  private getStatesByRange(startIndex: number, endIndex: number, fragment: Fragment, handler: Handler) {
    const formatRanges = fragment.formatMatrix.get(handler) || [];
    const childContents = fragment.contents.slice(startIndex, endIndex);

    if (startIndex === endIndex) {
      for (const format of formatRanges) {
        if (startIndex > format.startIndex && startIndex <= format.endIndex) {
          return format.state;
        }
      }
      return FormatState.Invalid;
    }

    const states: FormatState[] = [];
    let index = startIndex;
    for (const child of childContents) {
      if (typeof child === 'string') {
        for (const format of formatRanges) {
          if (index >= format.startIndex && index + child.length <= format.endIndex) {
            if (format.state === FormatState.Exclude) {
              return FormatState.Exclude;
            } else {
              states.push(format.state);
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
    return (node: Node, desc: MatchDescription) => {
      if (node.nodeType === 1) {
        for (const attr of attrs) {
          let b: boolean;
          if (attr.value) {
            const v = (node as HTMLElement).getAttribute(attr.key);
            if (Array.isArray(attr.value)) {
              b = attr.value.includes(v);
            } else {
              b = v === attr.value;
            }
            if (b) {
              desc.attribute = {
                key: attr.key,
                value: v
              };
              return true;
            }
          } else {
            b = (node as HTMLElement).hasAttribute(attr.key);
            if (b) {
              desc.attribute = {
                key: attr.key,
                value: (node as HTMLElement).getAttribute(attr.key)
              };
              return true;
            }
          }
        }
      }
      return false;
    }
  }

  private makeClassNameMatcher(classes: string[]) {
    return (node: Node, desc: MatchDescription) => {
      if (node.nodeType === 1) {
        for (const className of classes) {
          const b = (node as HTMLElement).classList.contains(className);
          if (b) {
            desc.className = className;
            return true;
          }
        }
      }
      return false;
    };
  }

  private makeStyleMatcher(styles: { [key: string]: number | string | RegExp | Array<number | string | RegExp> }) {
    return (node: Node, desc: MatchDescription) => {
      if (node.nodeType === 1) {
        const elementStyles = (node as HTMLElement).style;
        for (const key of Object.keys(styles)) {
          const optionValue = (Array.isArray(styles[key]) ?
            styles[key] :
            [styles[key]]) as Array<string | number | RegExp>;
          let styleValue = elementStyles[key];
          if (key === 'fontFamily' && typeof styleValue === 'string') {
            styleValue = styleValue.replace(/['"]/g, '');
          }
          for (const v of optionValue) {
            let b: boolean;
            if (v instanceof RegExp) {
              b = v.test(styleValue);
            } else {

              b = v === styleValue;
            }
            if (b) {
              desc.style = {
                key,
                value: styleValue
              };
              return b;
            }
          }
        }
      }
      return false;
    }
  }

  private static mergeStates(states: FormatState[]) {
    if (states.includes(FormatState.Exclude)) {
      return FormatState.Exclude;
    } else if (states.includes(FormatState.Invalid)) {
      return FormatState.Invalid;
    }
    return states.length ? FormatState.Valid : FormatState.Invalid;
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
