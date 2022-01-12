import { isMac, createElement, createTextNode } from '@textbus/browser'
import { Keymap } from '@textbus/core'

export function createKeymap(config: Keymap): Node[] {
  const arr: string[] = []
  if (config.ctrlKey) {
    arr.push(isMac ? 'textbus-icon-command' : 'Ctrl')
  }
  if (config.shiftKey) {
    arr.push(isMac ? 'textbus-icon-shift' : 'Shift')
  }
  if (config.altKey) {
    arr.push(isMac ? 'textbus-icon-opt' : 'Alt')
  }
  const keys = Array.isArray(config.key) ?
    config.key.map(i => i.toUpperCase()).join('/') :
    config.key.toUpperCase()
  const result: Node[] = []
  if (isMac) {
    result.push(...arr.map(s => {
      return createElement('span', {
        classes: [s]
      })
    }), createTextNode(keys))
  } else {
    arr.push(keys)

    arr.forEach((value, index) => {
      if (index - 1 > -1) {
        result.push(createElement('span', {
          classes: ['textbus-toolbar-keymap-join'],
          children: [createTextNode('+')]
        }))
      }
      result.push(createTextNode(value))
    })
  }
  return result
}
