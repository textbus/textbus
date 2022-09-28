import { Inject, Injectable, Injector } from '@tanbo/di'
import { Component, Shortcut } from '../model/_api'
import { Commander } from './commander'
import { Selection } from './selection'
import { COMPONENT_LIST, ZEN_CODING_DETECT } from './_injection-tokens'

export interface KeymapState {
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  key: string
}

export interface ZenCodingInterceptor {
  /** 匹配字符 */
  match: RegExp | ((content: string) => boolean)
  /** 触发键 */
  key: string | string[]

  /** 触发执行的方法 */
  action(content: string): boolean
}

/**
 * Textbus 键盘管理
 */
@Injectable()
export class Keyboard {
  private shortcutList: Shortcut[] = []
  private zenCodingInterceptors: ZenCodingInterceptor[] = []

  constructor(@Inject(COMPONENT_LIST) private components: Component[],
              @Inject(ZEN_CODING_DETECT) private markdownDetect: boolean,
              private commander: Commander,
              private injector: Injector,
              private selection: Selection) {
    components.forEach(component => {
      const config = component.zenCoding
      if (config) {
        this.zenCodingInterceptors.push({
          match(content: string) {
            return typeof config.match === 'function' ? config.match(content) : config.match.test(content)
          },
          key: config.key,
          action(content: string): boolean {
            const commonAncestorSlot = selection.commonAncestorSlot!
            const initData = config.generateInitData(content)
            const newInstance = component.createInstance(injector, initData)
            if (commonAncestorSlot.schema.includes(newInstance.type)) {
              selection.selectSlot(commonAncestorSlot)
              commander.delete()
              commander.insert(newInstance)
            } else {
              const parentComponent = commonAncestorSlot.parent
              if (parentComponent && parentComponent.slots.length > 1) {
                return false
              }
              const parentSlot = parentComponent?.parent
              if (!parentSlot) {
                return false
              }
              selection.selectComponent(parentComponent)
              commander.delete()
              commander.insert(newInstance)
            }
            const newSlot = newInstance.slots.first
            if (newSlot) {
              selection.setPosition(newSlot, 0)
            } else if (newInstance.parent) {
              const index = newInstance.parent.indexOf(newInstance)
              selection.setPosition(newInstance.parent, index + 1)
            }
            return true
          }
        })
      }
    })
  }

  /**
   * 注册输入语法糖
   * @param interceptor
   */
  addZenCodingInterceptor(interceptor: ZenCodingInterceptor) {
    this.zenCodingInterceptors.unshift(interceptor)
  }

  /**
   * 调用快捷键
   * @param keymapState 快捷键配置
   */
  execShortcut(keymapState: KeymapState): boolean {
    if (!this.selection.isSelected) {
      return false
    }
    const key = keymapState.key
    const reg = /\w+/.test(key) ? new RegExp(`^${key}$`, 'i') : new RegExp(`^[${key.replace(/([-^\\\]\[])/g, '\\$1')}]$`, 'i')

    const commonAncestorSlot = this.selection.commonAncestorSlot!
    if (this.markdownDetect &&
      !keymapState.ctrlKey &&
      !keymapState.shiftKey &&
      !keymapState.altKey &&
      commonAncestorSlot === this.selection.startSlot &&
      commonAncestorSlot === this.selection.endSlot) {
      for (const interceptor of this.zenCodingInterceptors) {
        const matchKey = Array.isArray(interceptor.key) ?
          interceptor.key.some(k => reg.test(k)) :
          reg.test(interceptor.key)
        if (matchKey) {
          const activeSlotContents = commonAncestorSlot.sliceContent()
          let content = activeSlotContents[0]
          if (activeSlotContents.length > 1 || typeof content !== 'string') {
            continue
          }

          content = content.replace(/\n$/, '')

          let matchContent = false
          if (interceptor.match instanceof RegExp) {
            matchContent = interceptor.match.test(content)
          } else if (typeof interceptor.match === 'function') {
            matchContent = interceptor.match(content)
          }
          if (matchContent) {
            const r = interceptor.action(content)
            if (!r) {
              break
            }
            return true
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
        const b = config.action(keymap.key)
        if (b !== false) {
          return true
        }
      }
    }
    return false
  }
}
