import { Inject, Injectable, Injector } from '@tanbo/di'
import { Component, MarkdownGrammarInterceptor, Shortcut } from '../model/_api'
import { Commander } from './commander'
import { Selection } from './selection'
import { COMPONENT_LIST, MARKDOWN_DETECT } from './_injection-tokens'

export interface KeymapState {
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  key: string
}

/**
 * Textbus 键盘管理
 */
@Injectable()
export class Keyboard {
  private shortcutList: Shortcut[] = []
  private markdownMatchers: Array<{ component: Component, markdownInterceptor: MarkdownGrammarInterceptor }> = []

  constructor(@Inject(COMPONENT_LIST) private components: Component[],
              @Inject(MARKDOWN_DETECT) private markdownDetect: boolean,
              private commander: Commander,
              private injector: Injector,
              private selection: Selection) {
    components.forEach(i => {
      if (i.markdownSupport) {
        this.markdownMatchers.push({
          markdownInterceptor: i.markdownSupport,
          component: i
        })
      }
    })
  }

  /**
   * 调用快捷键
   * @param keymapState 快捷键配置
   */
  execShortcut(keymapState: KeymapState): boolean {
    const key = keymapState.key
    const reg = /\w+/.test(key) ? new RegExp(`^${key}$`, 'i') : new RegExp(`^[${key.replace(/([-\\])/g, '\\$1')}]$`, 'i')

    const commonAncestorSlot = this.selection.commonAncestorSlot!
    if (this.markdownDetect &&
      !keymapState.ctrlKey &&
      !keymapState.shiftKey &&
      !keymapState.altKey &&
      commonAncestorSlot === this.selection.startSlot &&
      commonAncestorSlot === this.selection.endSlot) {
      for (const item of this.markdownMatchers) {
        const markdownConfig = item.markdownInterceptor
        const matchKey = Array.isArray(markdownConfig.key) ?
          markdownConfig.key.some(k => reg.test(k)) :
          reg.test(markdownConfig.key)
        if (matchKey) {
          const activeSlotContents = commonAncestorSlot.sliceContent()
          let content = activeSlotContents[0]
          if (activeSlotContents.length > 1 || typeof content !== 'string') {
            continue
          }

          content = content.replace(/\n$/, '')

          let matchContent = false
          if (markdownConfig.match instanceof RegExp) {
            matchContent = markdownConfig.match.test(content)
          } else if (typeof markdownConfig.match === 'function') {
            matchContent = markdownConfig.match(content)
          }
          if (matchContent) {
            const initData = markdownConfig.generateInitData(content)
            const newInstance = item.component.createInstance(this.injector, initData)
            if (commonAncestorSlot.schema.includes(newInstance.type)) {
              this.selection.selectSlot(commonAncestorSlot)
              this.commander.delete()
              this.commander.insert(newInstance)
            } else {
              const parentComponent = commonAncestorSlot.parent
              if (parentComponent && parentComponent.slots.length > 1) {
                break
              }
              const parentSlot = parentComponent?.parent
              if (!parentSlot) {
                break
              }
              this.selection.selectComponent(parentComponent)
              this.commander.delete()
              this.commander.insert(newInstance)
            }
            const newSlot = newInstance.slots.first
            if (newSlot) {
              this.selection.setPosition(newSlot, 0)
              return true
            } else if (newInstance.parent) {
              const index = newInstance.parent.indexOf(newInstance)
              this.selection.setPosition(newInstance.parent, index + 1)
              return true
            }
          }
        }
      }
    }
    const commonAncestorComponent = this.selection.commonAncestorComponent
    if (commonAncestorComponent) {
      const is = this.handleShortcut(reg, keymapState, commonAncestorComponent.shortcutList)
      if (is) {
        return true
      }
    }
    return this.handleShortcut(reg, keymapState, this.shortcutList)
  }

  /**
   * 注册快捷键
   * @param shortcut 快捷键配置
   */
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
