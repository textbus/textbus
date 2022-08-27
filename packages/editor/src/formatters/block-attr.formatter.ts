import { BlockFormatter, FormatHostBindingRender, FormatValue, VElement, FormatType, VTextNode } from '@textbus/core'

import { Matcher, MatchRule } from './matcher'
import { blockTags } from './_config'

export class BlockAttrFormatLoader extends Matcher {
  constructor(public attrName: string, formatter: BlockFormatter, rule: MatchRule) {
    super(formatter, rule)
  }

  override match(p: HTMLElement) {
    const reg = new RegExp(`^(${blockTags.join('|')})$`, 'i')
    if (!reg.test(p.tagName)) {
      return false
    }
    return super.match(p)
  }

  override read(node: HTMLElement) {
    return {
      formatter: this.formatter,
      value: this.extractFormatData(node, {
        attrs: [this.attrName]
      }).attrs?.[this.attrName] as FormatValue
    }
  }
}

export class BlockAttrFormatter implements BlockFormatter {
  type: FormatType.Block = FormatType.Block
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
export const dirFormatLoader = new BlockAttrFormatLoader('dir', dirFormatter, {
  attrs: [{
    key: 'dir',
    value: ['ltr', 'rtl']
  }]
})
