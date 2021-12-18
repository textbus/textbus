import { BlockFormatter, FormatType, VElement } from '@textbus/core'

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

  read(node: HTMLElement) {
    return this.extractFormatData(node, {
      attrs: [this.attrName]
    }).attrs as Record<string, string>
  }
}

export class BlockAttrFormatter implements BlockFormatter {
  type: FormatType.Block = FormatType.Block

  constructor(public name: string) {
  }

  render(node: VElement | null, formatValue: Record<string, string>): VElement | void {
    if (node) {
      Object.keys(formatValue).forEach(i => {
        node.attrs.set(i, formatValue[i])
      })
    }
    return new VElement('div', formatValue)
  }
}

export const dirFormatter = new BlockAttrFormatter('dir')

// 块级属性
export const dirFormatLoader = new BlockAttrFormatLoader('dir', dirFormatter, {
  attrs: [{
    key: 'dir',
    value: ['ltr', 'rtl']
  }]
})
