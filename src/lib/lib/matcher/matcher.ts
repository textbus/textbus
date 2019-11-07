export enum MatchState {
  Matched = 'Matched',
  Normal = 'Normal',
  Exclude = 'Exclude'
}

export interface MatchDelta {
  overlap: boolean;
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

  constructor(private rule: MatchRule) {
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
