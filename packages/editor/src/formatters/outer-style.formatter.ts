import { OuterFormatter, FormatType, VElement } from '@textbus/core'
import { Matcher, MatchRule } from './matcher'

export class OuterStyleFormatLoader extends Matcher {
  constructor(public styleName: string, formatter: OuterFormatter, rule: MatchRule) {
    super(formatter, rule)
  }

  read(node: HTMLElement) {
    return {
      formatter: this.formatter,
      value: this.extractFormatData(node, {
        styleName: this.styleName
      }).styles[this.styleName]
    }
  }
}

export class OuterStyleFormatter implements OuterFormatter {
  type: FormatType.Outer = FormatType.Outer

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
