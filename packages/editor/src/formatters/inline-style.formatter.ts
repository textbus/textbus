import { FormatHostBindingRender, InlineFormatter, VElement, VTextNode, FormatType } from '@textbus/core'

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

export class InlineStyleFormatter implements InlineFormatter {
  type: FormatType.Inline = FormatType.Inline

  constructor(public name: string,
              public styleName: string) {
  }

  render(children: Array<VElement | VTextNode>, formatValue: string): FormatHostBindingRender {
    return {
      fallbackTagName: 'span',
      attach: (host: VElement) => {
        host.styles.set(this.styleName, formatValue)
      }
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
