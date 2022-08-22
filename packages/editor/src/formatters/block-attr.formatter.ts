import { BlockFormatter, FormatPriority, FormatValue, VElement } from '@textbus/core'

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

export class BlockAttrFormatter extends BlockFormatter {
  constructor(name: string, public attrName: string) {
    super(name, FormatPriority.Attribute)
  }

  override render(node: VElement | null, formatValue: FormatValue): VElement | void {
    if (node) {
      node.attrs.set(this.attrName, formatValue)
      return node
    }
    return new VElement('div', {
      [this.attrName]: formatValue
    })
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
