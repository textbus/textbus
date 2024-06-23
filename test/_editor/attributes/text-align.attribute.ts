import { Attribute, VElement } from '@textbus/core'

export const textAlignAttribute = new Attribute<string>('textAlign', {
  render(node: VElement, formatValue: string) {
    node.styles.set('textAlign', formatValue)
  }
})
