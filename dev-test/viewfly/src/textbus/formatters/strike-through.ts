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

export const strikeThroughFormatter = new Formatter<boolean>('strike', {
  columned: true,
  render(children: Array<VElement | VTextNode | Component>): VElement | FormatHostBindingRender {
    return createVNode('del', null, children)
  }
})

export function toggleStrikeThrough(textbus: Textbus) {
  const controller = textbus.get(Controller)
  if (controller.readonly) {
    return
  }
  const query = textbus.get(Query)
  const commander = textbus.get(Commander)

  const state = query.queryFormat(strikeThroughFormatter)
  if (state.state === QueryStateType.Normal) {
    commander.applyFormat(strikeThroughFormatter, true)
  } else {
    commander.unApplyFormat(strikeThroughFormatter)
  }
}

export function registerStrikeThroughShortcut(textbus: Textbus) {
  const keyboard = textbus.get(Keyboard)

  keyboard.addShortcut({
    keymap: {
      ctrlKey: true,
      key: 'd'
    },
    action: () => {
      toggleStrikeThrough(textbus)
    }
  })
}

export const strikeThroughFormatLoader: FormatLoader<boolean> = {
  match(element: HTMLElement): boolean {
    return /^(strike|del|s)$/i.test(element.tagName) || /line-through/.test(element.style.textDecoration)
  },
  read(): FormatLoaderReadResult<boolean> {
    return {
      formatter: strikeThroughFormatter,
      value: true
    }
  }
}
