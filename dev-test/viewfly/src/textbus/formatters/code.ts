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

export const codeFormatter = new Formatter<boolean>('code', {
  inheritable: false,
  render(children: Array<VElement | VTextNode | Component>): VElement | FormatHostBindingRender {
    return createVNode('code', {
      class: 'xnote-code'
    }, children)
  }
})

export function toggleCode(textbus: Textbus) {
  const controller = textbus.get(Controller)
  if (controller.readonly) {
    return
  }
  const query = textbus.get(Query)
  const commander = textbus.get(Commander)

  const state = query.queryFormat(codeFormatter)
  if (state.state === QueryStateType.Normal) {
    commander.applyFormat(codeFormatter, true)
  } else {
    commander.unApplyFormat(codeFormatter)
  }
}

export function registerCodeShortcut(textbus: Textbus) {
  const keyboard = textbus.get(Keyboard)

  keyboard.addShortcut({
    keymap: {
      modKey: true,
      key: ','
    },
    action: () => {
      toggleCode(textbus)
    }
  })
}

export const codeFormatLoader: FormatLoader<boolean> = {
  match(element: HTMLElement): boolean {
    return element.tagName === 'CODE'
  },
  read(): FormatLoaderReadResult<boolean> {
    return {
      formatter: codeFormatter,
      value: true
    }
  }
}
