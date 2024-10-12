import { Attribute, Formatter, FormatValue } from '@textbus/core'

export interface EditableOptions {
  /** 设置是否要编辑标签 */
  tag?: boolean;
  /** 设置要编辑的 HTML 属性 */
  attrs?: string[];
  /** 设置要编辑的 Style */
  styleName?: string | string[];
}

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
  /** 自定义过滤器，以适配以上不能满足的特殊需求 */
  filter?: (node: HTMLElement) => boolean;
}

export abstract class Matcher<T extends FormatValue, U = Attribute<T> | Formatter<T>> {
  private validators: Array<(node: HTMLElement) => boolean> = []
  private excludeValidators: Array<(node: HTMLElement) => boolean> = []

  protected constructor(
    public target: U,
    protected rule: MatchRule,
  ) {
    if (rule.tags) {
      this.validators.push(this.makeTagsMatcher(rule.tags))
    }
    if (rule.styles) {
      this.validators.push(this.makeStyleMatcher(rule.styles))
    }
    if (rule.attrs) {
      this.validators.push(this.makeAttrsMatcher(rule.attrs))
    }
    if (rule.excludeStyles) {
      this.excludeValidators.push(this.makeStyleMatcher(rule.excludeStyles))
    }
    if (rule.excludeAttrs) {
      this.excludeValidators.push(this.makeAttrsMatcher(rule.excludeAttrs))
    }
  }

  match(element: HTMLElement) {
    if (this.rule.filter) {
      const b = this.rule.filter(element)
      if (!b) {
        return false
      }
    }
    const exclude = this.excludeValidators.map(fn => fn(element)).includes(true)
    if (exclude) {
      return false
    }
    return this.validators.map(fn => fn(element)).includes(true)
  }

  protected extractFormatData(node: HTMLElement, config: EditableOptions) {
    const attrs: Record<string, string> = {}
    if (config.attrs) {
      config.attrs.forEach(key => {
        attrs[key] = node.getAttribute(key)!
      })
    }
    const style: { [key: string]: string | number } = {}
    if (config.styleName) {
      (Array.isArray(config.styleName) ? config.styleName : [config.styleName]).forEach(name => {
        const v = node.style[name as any]
        if (v) {
          style[name] = v
        }
      })

    }
    return {
      tag: config.tag ? node.nodeName.toLowerCase() : null,
      attrs: Object.keys(attrs).length ? attrs : null,
      styles: style
    }
  }

  private makeTagsMatcher(tags: string[] | RegExp) {
    return (node: HTMLElement) => {
      const tagName = node.nodeName.toLowerCase()
      return Array.isArray(tags) ? tags.includes(tagName) : tags.test(tagName)
    }
  }

  private makeAttrsMatcher(attrs: Array<{ key: string; value?: string | string[] }>) {
    return (node: HTMLElement) => {
      return attrs.map(attr => {
        if (attr.value) {
          return node.getAttribute(attr.key) === attr.value
        }
        return node.hasAttribute(attr.key)
      }).includes(true)
    }
  }

  private makeStyleMatcher(styles: { [key: string]: number | string | RegExp | Array<number | string | RegExp> }) {
    return (node: HTMLElement) => {
      return !Object.keys(styles).map(key => {
        const optionValue = (Array.isArray(styles[key]) ?
          styles[key] :
          [styles[key]]) as Array<string | number | RegExp>
        let styleValue = node.style[key as any]
        if (key === 'fontFamily' && typeof styleValue === 'string') {
          styleValue = styleValue.replace(/['"]/g, '')
        }
        if (styleValue) {
          return optionValue.map(v => {
            if (v instanceof RegExp) {
              return v.test(styleValue)
            }
            return v === styleValue
          }).includes(true)
        }
        return false
      }).includes(false)
    }
  }
}
