import { isMac, createElement, createTextNode } from '@textbus/platform-browser'
import { Keymap } from '@textbus/core'

export function createKeymap(config: Keymap): Node[] {
  const _isMac = isMac()
  const arr: string[] = []
  if (config.ctrlKey) {
    arr.push(_isMac ? 'textbus-icon-command' : 'Ctrl')
  }
  if (config.shiftKey) {
    arr.push(_isMac ? 'textbus-icon-shift' : 'Shift')
  }
  if (config.altKey) {
    arr.push(_isMac ? 'textbus-icon-opt' : 'Alt')
  }
  const keys = Array.isArray(config.key) ?
    config.key.map(i => i.toUpperCase()).join('/') :
    typeof config.key === 'string' ?
      config.key.toUpperCase() :
      Array.isArray(config.key.name) ?
        config.key.name.map(i => i.toUpperCase()).join('/') :
        config.key.name.toLowerCase()
  const result: Node[] = []
  if (_isMac) {
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
