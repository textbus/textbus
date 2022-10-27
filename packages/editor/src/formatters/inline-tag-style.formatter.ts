import { Formatter, FormatValue, VElement, VTextNode } from '@textbus/core'

import { Matcher, MatchRule } from './matcher'
import { inlineTags } from './_config'
import { FormatLoader } from '@textbus/browser'

export class InlineTagStyleFormatLoader<T extends FormatValue> extends Matcher<T, Formatter<any>> implements FormatLoader<any> {
  constructor(public styleName: string, formatter: Formatter<any>, rule: MatchRule, public forceMatchTags = false) {
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
      formatter: this.target,
      value: this.extractFormatData(node, {
        styleName: this.styleName
      }).styles[this.styleName]
    }
  }
}

export class InlineTagStyleFormatter implements Formatter<any> {
  columned = false

  constructor(public name: string,
              public styleName: string) {
  }

  render(children: Array<VElement | VTextNode>, formatValue: string): VElement {
    if (children.length === 1 && children[0] instanceof VElement) {
      const node = children[0]
      if (node instanceof VElement) {
        const reg = new RegExp(`^(${inlineTags.join('|')})$`, 'i')
        if (node && reg.test(node.tagName)) {
          node.styles.set(this.styleName, formatValue)
          return node
        }
      }
    }
    return new VElement('span', {
      style: {
        [this.styleName]: formatValue
      }
    }, children)
  }
}

export class InlineTagLeafStyleFormatter extends InlineTagStyleFormatter {
  override columned = true
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
