import { Attribute, FormatHostBindingRender, FormatValue, VElement, VTextNode } from '@textbus/core'

import { Matcher, MatchRule } from './matcher'
import { blockTags } from './_config'
import { AttributeLoader } from '@textbus/browser'

export class BlockAttrLoader<T extends FormatValue> extends Matcher<T, Attribute<T>> implements AttributeLoader<any> {
  constructor(public attrName: string, attribute: Attribute<T>, rule: MatchRule) {
    super(attribute, rule)
  }

  override match(p: HTMLElement) {
    const reg = new RegExp(`^(${blockTags.join('|')})$`, 'i')
    if (!reg.test(p.tagName)) {
      return false
    }
    return super.match(p)
  }

  read(node: HTMLElement) {
    return {
      attribute: this.target,
      value: this.extractFormatData(node, {
        attrs: [this.attrName]
      }).attrs?.[this.attrName] as T
    }
  }
}

export class BlockAttrFormatter implements Attribute<string> {
  constructor(public name: string, public attrName: string) {
  }

  render(children: Array<VElement | VTextNode>, formatValue: FormatValue): FormatHostBindingRender {
    return {
      fallbackTagName: 'div',
      attach: (host: VElement) => {
        host.attrs.set(this.attrName, formatValue)
      }
    }
  }
}

export const dirFormatter = new BlockAttrFormatter('dir', 'dir')

// 块级属性
export const dirFormatLoader = new BlockAttrLoader('dir', dirFormatter, {
  attrs: [{
    key: 'dir',
    value: ['ltr', 'rtl']
  }]
})
