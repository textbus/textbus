import { Component, createVNode, FormatHostBindingRender, Formatter, VElement, VTextNode } from '@textbus/core'
import { FormatLoader, FormatLoaderReadResult } from '@textbus/platform-browser'

export interface LinkFormatData {
  href: string
  target?: '_blank' | '_self'
}

export const linkFormatter = new Formatter<LinkFormatData>('link', {
  priority: -1,
  inheritable: false,
  render(children: Array<VElement | VTextNode | Component>, formatValue: LinkFormatData, readonly = false): VElement | FormatHostBindingRender {
    if (readonly) {
      return createVNode('a', {
        href: formatValue.href,
        target: formatValue.target
      }, children)
    }
    return createVNode('a', {
      onClick(ev: Event) {
        ev.preventDefault()
      },
      'data-href': formatValue.href,
      style: {
        color: '#296eff',
        textDecoration: 'underline'
      },
      target: formatValue.target
    }, children)
  }
})

export const linkFormatLoader: FormatLoader<LinkFormatData> = {
  match(element: HTMLElement): boolean {
    return element.tagName === 'A'
  },
  read(element: HTMLLinkElement): FormatLoaderReadResult<LinkFormatData> {
    return {
      formatter: linkFormatter,
      value: {
        href: element.href || element.dataset.href as string,
        target: element.target as LinkFormatData['target'] || '_self'
      }
    }
  }
}
