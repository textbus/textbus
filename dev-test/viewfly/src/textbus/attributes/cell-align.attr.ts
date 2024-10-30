import { Attribute, VElement } from '@textbus/core'
import { AttributeLoader, AttributeLoaderReadResult } from '@textbus/platform-browser'

export const cellAlignAttr = new Attribute<string>('cellAlign', {
  render(node: VElement, formatValue: string) {
    node.styles.set('verticalAlign', formatValue)
  }
})

export const cellAlignAttrLoader: AttributeLoader<string> = {
  match(element: Element): boolean {
    return element instanceof HTMLTableCellElement && !!element.style.verticalAlign
  },
  read(element: Element): AttributeLoaderReadResult<string> {
    return {
      attribute: cellAlignAttr,
      value: (element as any as HTMLTableCellElement).style.verticalAlign!
    }
  }
}
