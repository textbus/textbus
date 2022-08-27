import { BlockFormatter, FormatHostBindingRender, VElement, VTextNode, FormatType } from '@textbus/core'

import { Matcher, MatchRule } from './matcher'
import { blockTags } from './_config'

export class BlockStyleFormatLoader extends Matcher {
  constructor(public styleName: string, formatter: BlockFormatter, rule: MatchRule) {
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
        styleName: this.styleName
      }).styles[this.styleName]
    }
  }
}

export class BlockStyleFormatter implements BlockFormatter {
  type: FormatType.Block = FormatType.Block
  constructor(public name: string,
              public styleName: string) {
  }

  render(children: Array<VElement | VTextNode>, formatValue: string): FormatHostBindingRender {
    return {
      fallbackTagName: 'div',
      attach: (host: VElement) => {
        host.styles.set(this.styleName, formatValue)
      }
    }
  }
}

// 块级样式
export const textIndentFormatter = new BlockStyleFormatter('textIndent', 'textIndent')
export const textAlignFormatter = new BlockStyleFormatter('textAlign', 'textAlign')
export const blockBackgroundColorFormatter = new BlockStyleFormatter('blockBackgroundColor', 'backgroundColor')
export const textIndentFormatLoader = new BlockStyleFormatLoader('textIndent', textIndentFormatter, {
  styles: {
    textIndent: /.+/
  }
})
export const textAlignFormatLoader = new BlockStyleFormatLoader('textAlign', textAlignFormatter, {
  styles: {
    textAlign: /.+/
  }
})

export const blockBackgroundColorFormatLoader = new BlockStyleFormatLoader('backgroundColor', blockBackgroundColorFormatter, {
  styles: {
    backgroundColor: /.+/
  }
})
