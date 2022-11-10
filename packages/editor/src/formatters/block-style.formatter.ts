import { VElement, Attribute, FormatValue } from '@textbus/core'

import { Matcher, MatchRule } from './matcher'
import { blockTags } from './_config'
import { AttributeLoader } from '@textbus/platform-browser'

export class BlockStyleFormatLoader<T extends FormatValue> extends Matcher<T, Attribute<T>> implements AttributeLoader<T> {
  constructor(public styleName: string, formatter: Attribute<any>, rule: MatchRule) {
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
    return {
      attribute: this.target,
      value: this.extractFormatData(node, {
        styleName: this.styleName
      }).styles[this.styleName] as T
    }
  }
}

export class BlockStyleFormatter implements Attribute<string> {
  constructor(public name: string,
              public styleName: string) {
  }

  render(host: VElement, formatValue: string) {
    host.styles.set(this.styleName, formatValue)
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
