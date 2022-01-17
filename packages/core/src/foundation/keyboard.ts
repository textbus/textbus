import { Injectable } from '@tanbo/di'
import { Shortcut } from '../model/_api'
import { Commander } from './commander'
import { TBSelection } from './selection'

export interface KeymapState {
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  key: string
}

@Injectable()
export class Keyboard {
  private shortcutList: Shortcut[] = []

  constructor(private commander: Commander,
              private selection: TBSelection) {
  }

  execShortcut(keymapState: KeymapState): boolean {
    const key = keymapState.key
    const reg = /\w+/.test(key) ? new RegExp(`^${key}$`, 'i') : new RegExp(`^[${key.replace(/([-\\])/g, '\\$1')}]$`, 'i')

    const commonAncestorComponent = this.selection.commonAncestorComponent
    if (commonAncestorComponent) {
      const is = this.handleShortcut(reg, keymapState, commonAncestorComponent.shortcutList)
      if (is) {
        return true
      }
    }
    return this.handleShortcut(reg, keymapState, this.shortcutList)
  }

  addShortcut(shortcut: Shortcut) {
    this.shortcutList.unshift(shortcut)
  }

  private handleShortcut(reg: RegExp, keymap: KeymapState, shortcutList: Shortcut[]) {
    for (const config of shortcutList) {
      const test = Array.isArray(config.keymap.key) ?
        config.keymap.key.map(k => reg.test(k)).includes(true) :
        reg.test(config.keymap.key)
      if (test &&
        !!config.keymap.altKey === keymap.altKey &&
        !!config.keymap.shiftKey === keymap.shiftKey &&
        !!config.keymap.ctrlKey === keymap.ctrlKey) {
        config.action(keymap.key)
        return true
      }
    }
    return false
  }
}
