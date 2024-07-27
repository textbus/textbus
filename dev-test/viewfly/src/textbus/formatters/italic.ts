import {
  Commander, Component,
  Controller,
  createVNode,
  FormatHostBindingRender,
  Formatter, Keyboard,
  Query, QueryStateType,
  Textbus,
  VElement,
  VTextNode
} from '@textbus/core'
import { FormatLoader, FormatLoaderReadResult } from '@textbus/platform-browser'

export const italicFormatter = new Formatter<boolean>('italic', {
  render(children: Array<VElement | VTextNode | Component>): VElement | FormatHostBindingRender {
    return createVNode('em', null, children)
  }
})

export function toggleItalic(textbus: Textbus) {
  const controller = textbus.get(Controller)
  if (controller.readonly) {
    return
  }
  const query = textbus.get(Query)
  const commander = textbus.get(Commander)

  const state = query.queryFormat(italicFormatter)
  if (state.state === QueryStateType.Normal) {
    commander.applyFormat(italicFormatter, true)
  } else {
    commander.unApplyFormat(italicFormatter)
  }
}

export function registerItalicShortcut(textbus: Textbus) {
  const keyboard = textbus.get(Keyboard)

  keyboard.addShortcut({
    keymap: {
      ctrlKey: true,
      key: 'i'
    },
    action: () => {
      toggleItalic(textbus)
    }
  })
}

export const italicFormatLoader: FormatLoader<boolean> = {
  match(element: HTMLElement): boolean {
    return element.tagName === 'EM' || element.tagName === 'I' || /italic/.test(element.style.fontStyle)
  },
  read(): FormatLoaderReadResult<boolean> {
    return {
      formatter: italicFormatter,
      value: true
    }
  }
}
