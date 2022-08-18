import { AttributeFormatter, FormatType, VElement } from '@textbus/core'

import { Matcher, MatchRule } from './matcher'
import { inlineTags } from './_config'

export class InlineTagStyleFormatLoader extends Matcher {
  constructor(public styleName: string, formatter: AttributeFormatter, rule: MatchRule, public forceMatchTags = false) {
    super(formatter, rule)
  }

  override match(element: HTMLElement): boolean {
    if (this.forceMatchTags) {
      const reg = new RegExp(`^(${inlineTags.join('|')})$`, 'i')
      if (!reg.test(element.tagName)) {
        return false
      }
    }
    return super.match(element)
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

export class InlineTagStyleFormatter implements AttributeFormatter {
  type: FormatType.Attribute = FormatType.Attribute

  constructor(public name: string,
              public styleName: string) {
  }

  render(node: VElement | null, formatValue: string): VElement | void {
    const reg = new RegExp(`^(${inlineTags.join('|')})$`, 'i')
    if (node && reg.test(node.tagName)) {
      node.styles.set(this.styleName, formatValue)
      return
    }
    node = new VElement('span')
    node.styles.set(this.styleName, formatValue)
    return node
  }
}

export class InlineTagLeafStyleFormatter extends InlineTagStyleFormatter {
  columned = true
}

// 强制行内样式
export const verticalAlignFormatter = new InlineTagStyleFormatter('verticalAlign', 'verticalAlign')
export const textBackgroundColorFormatter = new InlineTagLeafStyleFormatter('textBackgroundColor', 'backgroundColor')

export const verticalAlignFormatLoader = new InlineTagStyleFormatLoader('verticalAlign', verticalAlignFormatter, {
  styles: {
    verticalAlign: /.+/
  }
}, true)

export const textBackgroundColorFormatLoader = new InlineTagStyleFormatLoader('backgroundColor', textBackgroundColorFormatter, {
  styles: {
    backgroundColor: /.+/
  }
}, true)
