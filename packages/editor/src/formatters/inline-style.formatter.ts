import { AttributeFormatter, FormatType, VElement } from '@textbus/core'

import { Matcher, MatchRule } from './matcher'

export class InlineStyleFormatLoader extends Matcher {
  constructor(public styleName: string, formatter: AttributeFormatter, rule: MatchRule) {
    super(formatter, rule)
  }

  read(node: HTMLElement) {
    return this.extractFormatData(node, {
      styleName: this.styleName
    }).styles[this.styleName]
  }
}

export class InlineStyleFormatter implements AttributeFormatter {
  type: FormatType.Attribute = FormatType.Attribute

  constructor(public name: string,
              public styleName: string) {
  }

  render(node: VElement | null, formatValue: string): VElement | void {
    if (node) {
      node.styles.set(this.styleName, formatValue)
    } else {
      const el = new VElement('span')
      el.styles.set(this.styleName, formatValue)
      return el
    }
  }
}


// 行内样式
export const colorFormatter = new InlineStyleFormatter('color', 'color')
export const fontSizeFormatter = new InlineStyleFormatter('fontSize', 'fontSize')
export const letterSpacingFormatter = new InlineStyleFormatter('letterSpacing', 'letterSpacing')
export const fontFamilyFormatter = new InlineStyleFormatter('fontFamily', 'fontFamily')
export const lineHeightFormatter = new InlineStyleFormatter('lineHeight', 'lineHeight')
export const colorFormatLoader = new InlineStyleFormatLoader('color', colorFormatter, {
  styles: {
    color: /.+/
  }
})

export const fontSizeFormatLoader = new InlineStyleFormatLoader('fontSize', fontSizeFormatter, {
  styles: {
    fontSize: /.+/
  }
})

export const letterSpacingFormatLoader = new InlineStyleFormatLoader('letterSpacing', letterSpacingFormatter, {
  styles: {
    letterSpacing: /.+/
  }
})
export const fontFamilyFormatLoader = new InlineStyleFormatLoader('fontFamily', fontFamilyFormatter, {
  styles: {
    fontFamily: /.+/
  }
})
export const lineHeightFormatLoader = new InlineStyleFormatLoader('lineHeight', lineHeightFormatter, {
  styles: {
    lineHeight: /.+/
  }
})
