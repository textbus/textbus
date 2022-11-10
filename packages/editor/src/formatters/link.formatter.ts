import { VElement, VTextNode, FormatValue, Formatter } from '@textbus/core'

import { Matcher } from './matcher'
import { FormatLoader } from '@textbus/platform-browser'

export class LinkFormatLoader<T extends FormatValue> extends Matcher<T, Formatter<any>> implements FormatLoader<any> {
  constructor(formatter: Formatter<any>) {
    super(formatter, {
      tags: ['a']
    })
  }

  read(element: HTMLElement) {
    return {
      formatter: this.target,
      value: this.extractFormatData(element, {
        attrs: ['target', 'href', 'data-href']
      }).attrs as Record<string, string>
    }
  }
}

export class LinkFormatter implements Formatter<any> {
  name = 'link'

  columned = false

  render(children: Array<VElement | VTextNode>, formatValue: Record<string, string>, isOutputMode: boolean): VElement {
    if (isOutputMode) {
      return new VElement('a', {
        target: formatValue.target,
        href: formatValue.href || formatValue['data-href']
      }, children)
    }
    return new VElement('a', {
      target: formatValue.target,
      'data-href': formatValue.href || formatValue['data-href']
    }, children)
  }
}

export const linkFormatter = new LinkFormatter()

export const linkFormatLoader = new LinkFormatLoader(linkFormatter)
