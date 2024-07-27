import { Attribute, Commander, Keyboard, Selection, Textbus, VElement } from '@textbus/core'
import { AttributeLoader, AttributeLoaderReadResult } from '@textbus/platform-browser'

import { SourceCodeComponent } from '../components/source-code/source-code.component'

export const textIndentAttr = new Attribute<number>('textIndent', {
  render(node: VElement, formatValue: number) {
    return node.styles.set('text-indent', formatValue * 24 + 'px')
  }
})

export const textIndentAttrLoader: AttributeLoader<number> = {
  match(element: HTMLElement): boolean {
    return !!element.style.textIndent
  },
  read(element: HTMLElement): AttributeLoaderReadResult<number> {
    return {
      attribute: textIndentAttr,
      value: (parseInt(element.style.textIndent) || 0) / 24
    }
  }
}

export function registerTextIndentShortcut(textbus: Textbus) {
  const keyboard = textbus.get(Keyboard)
  const selection = textbus.get(Selection)
  const commander = textbus.get(Commander)

  keyboard.addShortcut({
    keymap: {
      key: 'Tab',
    },
    action(): boolean | void {
      const blocks = selection.getBlocks()
      blocks.forEach(block => {
        if (block.slot.parent instanceof SourceCodeComponent) {
          return
        }
        const currentIndent = block.slot.getAttribute(textIndentAttr)
        if (typeof currentIndent === 'number') {
          block.slot.setAttribute(textIndentAttr, currentIndent + 1)
        } else {
          block.slot.setAttribute(textIndentAttr, 1)
        }
      })
    }
  })
  keyboard.addShortcut({
    keymap: {
      key: 'Tab',
      shiftKey: true,
    },
    action(): boolean | void {
      const blocks = selection.getBlocks()
      blocks.forEach(block => {
        const currentIndent = block.slot.getAttribute(textIndentAttr)
        if (typeof currentIndent === 'number' && currentIndent > 1) {
          block.slot.setAttribute(textIndentAttr, currentIndent - 1)
        } else {
          block.slot.removeAttribute(textIndentAttr)
        }
      })
    }
  })

  keyboard.addShortcut({
    keymap: {
      key: 'Backspace'
    },
    action(): boolean | void {
      if (!selection.isCollapsed) {
        return false
      }
      const slot = selection.commonAncestorSlot!
      const currentIndent = slot.getAttribute(textIndentAttr)
      if (typeof currentIndent === 'number' && selection.startOffset === 0) {
        if (currentIndent > 1) {
          slot.setAttribute(textIndentAttr, currentIndent - 1)
        } else {
          slot.removeAttribute(textIndentAttr)
        }
      } else {
        commander.delete(true)
      }
    }
  })
}
