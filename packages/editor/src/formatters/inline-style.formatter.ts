import { FormatPriority, InlineFormatter, VElement } from '@textbus/core'

import { Matcher, MatchRule } from './matcher'

export class InlineStyleFormatLoader extends Matcher {
  constructor(public styleName: string, formatter: InlineStyleFormatter, rule: MatchRule) {
    super(formatter, rule)
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

export class InlineStyleFormatter extends InlineFormatter {
  constructor(name: string,
              public styleName: string) {
    super(name, FormatPriority.Attribute)
  }

  override render(node: VElement | null, formatValue: string): VElement | void {
    if (node) {
      node.styles.set(this.styleName, formatValue)
    } else {
      const el = new VElement('span')
      el.styles.set(this.styleName, formatValue)
      return el
    }
  }
}

export const letterSpacingFormatter = new InlineStyleFormatter('letterSpacing', 'letterSpacing')
export const fontFamilyFormatter = new InlineStyleFormatter('fontFamily', 'fontFamily')
export const lineHeightFormatter = new InlineStyleFormatter('lineHeight', 'lineHeight')

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
