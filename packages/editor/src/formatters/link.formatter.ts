import { InlineFormatter, VElement, VTextNode, FormatType } from '@textbus/core'

import { Matcher } from './matcher'

export class LinkFormatLoader extends Matcher {
  constructor(formatter: LinkFormatter) {
    super(formatter, {
      tags: ['a']
    })
  }

  override read(element: HTMLElement) {
    return {
      formatter: this.formatter,
      value: this.extractFormatData(element, {
        attrs: ['target', 'href', 'data-href']
      }).attrs as Record<string, string>
    }
  }
}

export class LinkFormatter implements InlineFormatter {
  type: FormatType.Inline = FormatType.Inline
  name = 'link'

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
