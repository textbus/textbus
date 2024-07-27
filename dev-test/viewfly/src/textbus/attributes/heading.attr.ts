import { Attribute, Commander, Keyboard, Selection, Textbus, VElement } from '@textbus/core'
import { AttributeLoader, AttributeLoaderReadResult } from '@textbus/platform-browser'

import { SourceCodeComponent } from '../components/source-code/source-code.component'

export const headingAttr = new Attribute<string>('Heading', {
  render(node: VElement, formatValue: string) {
    node.classes.add('xnote-' + formatValue)
  }
})

export const headingAttrLoader: AttributeLoader<string> = {
  match(element: HTMLElement): boolean {
    return /H[1-6]/.test(element.tagName) || /(^|\s)xnote-h[1-6](\s|$)/.test(element.className)
  },
  read(element: HTMLElement): AttributeLoaderReadResult<string> {
    if (/H[1-6]/.test(element.tagName)) {
      return {
        attribute: headingAttr,
        value: element.tagName.toLowerCase()
      }
    }
    return {
      attribute: headingAttr,
      value: element.className.substring(6)
    }
  }
}

export function registerHeadingShortcut(textbus: Textbus) {
  const keyboard = textbus.get(Keyboard)
  const commander = textbus.get(Commander)
  const selection = textbus.get(Selection)

  keyboard.addShortcut({
    keymap: {
      key: '0123456'.split(''),
      ctrlKey: true
    },
    action(key: string): boolean | void {
      if (key === '0') {
        commander.unApplyAttribute(headingAttr)
        return
      }
      commander.applyAttribute(headingAttr, 'h' + key)
    }
  })

  keyboard.addZenCodingInterceptor({
    match(content: string) {
      return /^#{1,6}$/.test(content)
    },
    try(key: string): boolean {
      return key === ' '
    },
    action(content) {
      if (selection.commonAncestorComponent instanceof SourceCodeComponent) {
        return false
      }
      const commonAncestorSlot = selection.commonAncestorSlot!
      commonAncestorSlot.cut()
      commander.applyAttribute(headingAttr, 'h' + content.length)
      selection.setPosition(commonAncestorSlot, 0)
      return true
    }
  })
}
