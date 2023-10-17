import {
  FormatHostBindingRender,
  VElement,
  VTextNode,
  FormatValue,
  Formatter
} from '@textbus/core'

import { Matcher, MatchRule } from './matcher'
import { FormatLoader } from '@textbus/platform-browser'

export class InlineStyleFormatLoader<T extends FormatValue> extends Matcher<T, Formatter<any>> implements FormatLoader<T> {
  constructor(public styleName: string, formatter: InlineStyleFormatter, rule: MatchRule) {
    super(formatter, rule)
  }

  read(node: HTMLElement) {
    return {
      formatter: this.target,
      value: this.extractFormatData(node, {
        styleName: this.styleName
      }).styles[this.styleName] as T
    }
  }
}

export class InlineStyleFormatter implements Formatter<string> {
  priority = 0
  columned = false

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
