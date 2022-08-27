import { FormatHostBindingRender, InlineFormatter, VElement, VTextNode, FormatType } from '@textbus/core'
import { Matcher, MatchRule } from './matcher'

export class OuterStyleFormatLoader extends Matcher {
  constructor(public styleName: string, formatter: OuterStyleFormatter, rule: MatchRule) {
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

export class OuterStyleFormatter implements InlineFormatter {
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

export const colorFormatter = new OuterStyleFormatter('color', 'color')
export const colorFormatLoader = new OuterStyleFormatLoader('color', colorFormatter, {
  styles: {
    color: /.+/
  }
})

export const fontSizeFormatter = new OuterStyleFormatter('fontSize', 'fontSize')
export const fontSizeFormatLoader = new OuterStyleFormatLoader('fontSize', fontSizeFormatter, {
  styles: {
    fontSize: /.+/
  }
})
