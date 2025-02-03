import { Component, createVNode, FormatHostBindingRender, Formatter, VElement, VTextNode } from '@textbus/core'

export const fontSizeFormatter = new Formatter<string>('fontSize', {
  columned: false,
  inheritable: true,
  priority: 0,
  render(children: Array<VElement | VTextNode | Component>, formatValue: string): VElement | FormatHostBindingRender {
    return createVNode('span', {
      style: {
        fontSize: formatValue
      }
    }, children)
  }
})
