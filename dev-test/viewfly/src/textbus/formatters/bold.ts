import {
  Commander, Component,
  Controller,
  createVNode,
  FormatHostBindingRender,
  Formatter,
  Keyboard, Query, QueryStateType,
  Textbus,
  VElement,
  VTextNode
} from '@textbus/core'
import { FormatLoader, FormatLoaderReadResult } from '@textbus/platform-browser'

export const boldFormatter = new Formatter<boolean>('bold', {
  render(children: Array<VElement | VTextNode | Component>): VElement | FormatHostBindingRender {
    return createVNode('strong', null, children)
  }
})

export function toggleBold(textbus: Textbus) {
  const controller = textbus.get(Controller)
  if (controller.readonly) {
    return
  }
  const query = textbus.get(Query)
  const commander = textbus.get(Commander)

  const state = query.queryFormat(boldFormatter)
  if (state.state === QueryStateType.Normal) {
    commander.applyFormat(boldFormatter, true)
  } else {
    commander.unApplyFormat(boldFormatter)
  }
}

export function registerBoldShortcut(textbus: Textbus) {
  const keyboard = textbus.get(Keyboard)

  keyboard.addShortcut({
    keymap: {
      modKey: true,
      key: 'b'
    },
    action: () => {
      toggleBold(textbus)
    }
  })
}

export const boldFormatLoader: FormatLoader<boolean> = {
  match(element: HTMLElement): boolean {
    return element.tagName === 'STRONG' || element.tagName === 'B' || /bold|[5-9]00/.test(element.style.fontWeight)
  },
  read(): FormatLoaderReadResult<boolean> {
    return {
      formatter: boldFormatter,
      value: true
    }
  }
}
