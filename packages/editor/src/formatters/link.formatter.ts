import { Formatter, FormatValue, RenderMode, VElement, VTextNode } from '@textbus/core'
import { FormatLoader } from '@textbus/platform-browser'

import { Matcher } from './matcher'

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
  priority = -1
  name = 'link'

  columned = false

  render(children: Array<VElement | VTextNode>, formatValue: Record<string, string>, renderMode: RenderMode): VElement {
    if (renderMode !== RenderMode.Editing) {
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
