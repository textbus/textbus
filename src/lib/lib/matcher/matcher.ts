import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';
import { Fragment } from '../parser/fragment';
import { TBRange } from '../selection/range';

export enum MatchState {
  Matched = 'Matched',
  Normal = 'Normal',
  Exclude = 'Exclude'
}

export interface MatchDelta {
  overlap: boolean;
  fromRange: TBRange;
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

  matchNode(node: Node): MatchState {
    const exclude = this.excludeValidators.map(fn => fn(node)).includes(true);
    if (exclude) {
      return MatchState.Exclude;
    }
    return this.validators.map(fn => fn(node)).includes(true) ? MatchState.Matched : MatchState.Normal;
  }

  queryState(selection: TBSelection, handler: Handler): CommonMatchDelta {
    const srcStates: MatchDelta[] = selection.ranges.map(range => {
      const overlap = this.overlap(
        range.startIndex,
        range.endIndex,
        range.commonAncestorFragment,
        handler);
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

  private overlap(startIndex: number, endIndex: number, fragment: Fragment, handler: Handler): boolean {
    const overlapSelf = this.matchStateByRange(startIndex, endIndex, fragment, handler);
    if (overlapSelf) {
      return fragment.contents.slice(startIndex, endIndex).filter(item => {
        return item instanceof Fragment;
      }).reduce((value, ff) => {
        return value && this.overlap(0, (ff as Fragment).contents.length, (ff as Fragment), handler);
      }, true);
    }
    return this.inSingleContainer(startIndex, endIndex, fragment, handler);
  }

  private inSingleContainer(startIndex: number,
                            endIndex: number,
                            fragment: Fragment,
                            handler: Handler): boolean {
    while (true) {
      const inContainer = this.matchStateByRange(startIndex, endIndex, fragment, handler);
      if (inContainer) {
        return true;
      } else {
        if (fragment.parent) {
          startIndex = Array.from(fragment.parent.contents).indexOf(fragment);
          endIndex = startIndex + 1;
          fragment = fragment.parent;
        } else {
          break;
        }
      }
    }
    return false;
  }

  private matchStateByRange(startIndex: number,
                            endIndex: number,
                            fragment: Fragment,
                            handler: Handler): boolean {
    if (this.matchNode(fragment.elementRef) === MatchState.Matched) {
      return true;
    }
    const formatRanges = fragment.formatMatrix.get(handler);
    if (formatRanges) {
      if (formatRanges[0].state === MatchState.Matched) {
        return startIndex >= formatRanges[0].startIndex && endIndex <= formatRanges[0].endIndex;
      }
    }
    return false;
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
}
