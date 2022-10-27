import { FormatHostBindingRender, VElement, VTextNode, Formatter } from '@textbus/core'
import { Matcher, MatchRule } from './matcher'
import { FormatLoader } from '@textbus/browser'

export class OuterStyleFormatLoader extends Matcher<any, Formatter<any>> implements FormatLoader<any> {
  constructor(public styleName: string, formatter: Formatter<any>, rule: MatchRule) {
    super(formatter, rule)
  }

  read(node: HTMLElement) {
    return {
      formatter: this.target,
      value: this.extractFormatData(node, {
        styleName: this.styleName
      }).styles[this.styleName]
    }
  }
}

export class OuterStyleFormatter implements Formatter<any> {
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
