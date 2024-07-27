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

export const underlineFormatter = new Formatter<boolean>('underline', {
  columned: true,
  render(children: Array<VElement | VTextNode | Component>): VElement | FormatHostBindingRender {
    return createVNode('u', null, children)
  }
})

export function toggleUnderline(textbus: Textbus) {
  const controller = textbus.get(Controller)
  if (controller.readonly) {
    return
  }
  const query = textbus.get(Query)
  const commander = textbus.get(Commander)

  const state = query.queryFormat(underlineFormatter)
  if (state.state === QueryStateType.Normal) {
    commander.applyFormat(underlineFormatter, true)
  } else {
    commander.unApplyFormat(underlineFormatter)
  }
}

export function registerUnderlineShortcut(textbus: Textbus) {
  const keyboard = textbus.get(Keyboard)

  keyboard.addShortcut({
    keymap: {
      ctrlKey: true,
      key: 'u'
    },
    action: () => {
      toggleUnderline(textbus)
    }
  })
}

export const underlineFormatLoader: FormatLoader<boolean> = {
  match(element: HTMLElement): boolean {
    return element.tagName === 'U'
  },
  read(): FormatLoaderReadResult<boolean> {
    return {
      formatter: underlineFormatter,
      value: true
    }
  }
}
