import { Attribute, Commander, Keyboard, Textbus, VElement } from '@textbus/core'
import { AttributeLoader, AttributeLoaderReadResult } from '@textbus/platform-browser'

export const textAlignAttr = new Attribute<string>('textAlign', {
  render(node: VElement, formatValue: string) {
    node.styles.set('text-align', formatValue)
  }
})

export const textAlignAttrLoader: AttributeLoader<string> = {
  match(element: HTMLElement): boolean {
    return !!element.style.textAlign
  },
  read(element: HTMLElement): AttributeLoaderReadResult<string> {
    return {
      attribute: textAlignAttr,
      value: element.style.textAlign
    }
  }
}

export function registerTextAlignShortcut(textbus: Textbus) {
  const keyboard = textbus.get(Keyboard)
  const commander = textbus.get(Commander)

  keyboard.addShortcut({
    keymap: {
      key: 'lrej'.split(''),
      modKey: true
    },
    action(key: string): boolean | void {
      const valueMap = {
        l: 'left',
        r: 'right',
        e: 'center',
        j: 'justify'
      }

      commander.applyAttribute(textAlignAttr, valueMap[key])
    }
  })
}
