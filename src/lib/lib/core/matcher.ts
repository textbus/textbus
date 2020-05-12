import { AbstractData } from '../../../lib/lib/parser/abstract-data';
import { MatchState } from '../../../lib/lib/matcher/matcher';

/**
 * 匹配规则
 */
export interface MatchRule {
  /** 匹配的标签 */
  tags?: string[] | RegExp;
  /** 匹配的样式 */
  styles?: { [key: string]: number | string | RegExp | Array<number | string | RegExp> };
  // classes?: string[];
  /** 匹配的属性 */
  attrs?: Array<{ key: string; value?: string | string[] }>;
  /** 可继承样式的标签，如加粗，可继承自 h1~h6 */
  extendTags?: string[] | RegExp;
  /** 排除的样式 */
  excludeStyles?: { [key: string]: number | string | RegExp | Array<number | string | RegExp> };
  // excludeClasses?: string[];
  /** 排除的属性 */
  excludeAttrs?: Array<{ key: string; value?: string | string[] }>;
  /** 不能包含哪些标签 */
  noContainTags?: string[] | RegExp;
  /** 不能在哪些标签之内 */
  noInTags?: string[] | RegExp;
  /** 自定义过滤器，以适配以上不能满足的特殊需求 */
  filter?: (node: HTMLElement | AbstractData) => boolean;
}

export class Matcher {
  private inheritValidators: Array<(node: HTMLElement | AbstractData) => boolean> = [];
  private validators: Array<(node: HTMLElement | AbstractData) => boolean> = [];
  private excludeValidators: Array<(node: HTMLElement | AbstractData) => boolean> = [];

  constructor(private rule: MatchRule = {}) {
    if (rule.extendTags) {
      this.inheritValidators.push(this.makeTagsMatcher(rule.extendTags));
    }
    if (rule.tags) {
      this.validators.push(this.makeTagsMatcher(rule.tags));
    }
    // if (rule.classes) {
    //   this.validators.push(this.makeClassNameMatcher(rule.classes));
    // }
    if (rule.styles) {
      this.validators.push(this.makeStyleMatcher(rule.styles));
    }
    if (rule.attrs) {
      this.validators.push(this.makeAttrsMatcher(rule.attrs));
    }
    // if (rule.excludeClasses) {
    //   this.excludeValidators.push(this.makeClassNameMatcher(rule.excludeClasses));
    // }
    if (rule.excludeStyles) {
      this.excludeValidators.push(this.makeStyleMatcher(rule.excludeStyles));
    }
    if (rule.excludeAttrs) {
      this.excludeValidators.push(this.makeAttrsMatcher(rule.excludeAttrs));
    }
  }

  match(p: HTMLElement | AbstractData) {
    if (this.rule.filter) {
      const b = this.rule.filter(p);
      if (!b) {
        return MatchState.Invalid;
      }
    }
    const exclude = this.excludeValidators.map(fn => fn(p)).includes(true);
    if (exclude) {
      return MatchState.Exclude;
    }
    const inherit = this.inheritValidators.map(fn => fn(p)).includes(true);
    if (inherit) {
      return MatchState.Inherit;
    }
    return this.validators.map(fn => fn(p)).includes(true) ? MatchState.Valid : MatchState.Invalid;
  }

  private makeTagsMatcher(tags: string[] | RegExp) {
    return (node: HTMLElement | AbstractData) => {
      const tagName = node instanceof AbstractData ? node.tag : node.nodeName.toLowerCase();
      return Array.isArray(tags) ? tags.includes(tagName) : tags.test(tagName);
    };
  }

  private makeAttrsMatcher(attrs: Array<{ key: string; value?: string | string[] }>) {
    return (node: HTMLElement | AbstractData) => {
      return attrs.map(attr => {
        if (attr.value) {
          if (node instanceof AbstractData) {
            return node?.attrs.get(attr.key) === attr.value;
          }
          if (node instanceof HTMLElement) {
            return node.getAttribute(attr.key) === attr.value;
          }
        } else {
          if (node instanceof AbstractData) {
            return node?.attrs.has(attr.key);
          }
          if (node instanceof HTMLElement) {
            return node.hasAttribute(attr.key);
          }
        }
        return false;
      }).includes(true);
    }
  }

  // private makeClassNameMatcher(classes: string[]) {
  //   return (node: HTMLElement | abstractData | abstractDataParams) => {
  //     return classes.map(className => {
  //       return node.classList.contains(className);
  //     }).includes(true);
  //   };
  // }

  private makeStyleMatcher(styles: { [key: string]: number | string | RegExp | Array<number | string | RegExp> }) {
    return (node: HTMLElement | AbstractData) => {
      const elementStyles = node.style;
      if (!elementStyles) {
        return false;
      }
      if (node instanceof AbstractData) {
        return !Object.keys(styles).map(key => {
          const optionValue = (Array.isArray(styles[key]) ?
            styles[key] :
            [styles[key]]) as Array<string | number | RegExp>;
          let styleValue = node.style.name === key ? node.style.value + '' : '';
          if (key === 'fontFamily' && typeof styleValue === 'string') {
            styleValue = styleValue.replace(/['"]/g, '');
          }
          if (styleValue) {
            return optionValue.map(v => {
              if (v instanceof RegExp) {
                return v.test(styleValue);
              }
              return v === styleValue;
            }).includes(true);
          }
          return false;
        }).includes(false);
      }
      return !Object.keys(styles).map(key => {
        const optionValue = (Array.isArray(styles[key]) ?
          styles[key] :
          [styles[key]]) as Array<string | number | RegExp>;
        let styleValue = elementStyles[key];
        if (key === 'fontFamily' && typeof styleValue === 'string') {
          styleValue = styleValue.replace(/['"]/g, '');
        }
        if (styleValue) {
          return optionValue.map(v => {
            if (v instanceof RegExp) {
              return v.test(styleValue);
            }
            return v === styleValue;
          }).includes(true);
        }
        return false;
      }).includes(false);
    }
  }
}
