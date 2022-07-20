import { Injector } from '@tanbo/di'
import { Commander, History, Keyboard, Selection, Plugin } from '@textbus/core'
import { EDITOR_OPTIONS } from '../core/_api'

/**
 * Textbus PC 端默认按键绑定
 */
export class DefaultShortcut implements Plugin {
  setup(injector: Injector) {
    const selection = injector.get(Selection)
    const keyboard = injector.get(Keyboard)
    const history = injector.get(History)
    const options = injector.get(EDITOR_OPTIONS)
    const commander = injector.get(Commander)
    keyboard.addShortcut({
      keymap: {
        key: 'Enter'
      },
      action: () => {
        commander.break()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'Enter',
        shiftKey: true
      },
      action: () => {
        const startOffset = selection.startOffset!
        const startSlot = selection.startSlot!
        const isToEnd = startOffset === startSlot.length || startSlot.isEmpty
        const content = isToEnd ? '\n\n' : '\n'
        const isInserted = commander.insert(content)
        if (isInserted && isToEnd) {
          selection.setPosition(startSlot, startOffset + 1)
        }
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: ['Delete', 'Backspace']
      },
      action: (key) => {
        commander.delete(key === 'Backspace')
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
      },
      action: (key) => {
        switch (key) {
          case 'ArrowLeft':
            selection.toPrevious()
            break
          case 'ArrowRight':
            selection.toNext()
            break
          case 'ArrowUp':
            selection.toPreviousLine()
            break
          case 'ArrowDown':
            selection.toNextLine()
            break
        }
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'],
        shiftKey: true
      },
      action: (key) => {
        switch (key) {
          case 'ArrowLeft':
            selection.wrapToBefore()
            break
          case 'ArrowRight':
            selection.wrapToAfter()
            break
          case 'ArrowUp':
            selection.wrapToTop()
            break
          case 'ArrowDown':
            selection.wrapToBottom()
            break
        }
      }
    })

    keyboard.addShortcut({
      keymap: {
        key: 'Tab'
      },
      action: () => {
        commander.insert('    ')
      }
    })

    keyboard.addShortcut({
      keymap: {
        key: 'a',
        ctrlKey: true
      },
      action: () => {
        selection.selectAll()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'c',
        ctrlKey: true
      },
      action: () => {
        commander.copy()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'x',
        ctrlKey: true
      },
      action: () => {
        commander.cut()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'z',
        ctrlKey: true
      },
      action: () => {
        history.back()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'z',
        ctrlKey: true,
        shiftKey: true
      },
      action: () => {
        history.forward()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 's',
        ctrlKey: true
      },
      action: () => {
        options.onSave?.()
      }
    })
  }
}
