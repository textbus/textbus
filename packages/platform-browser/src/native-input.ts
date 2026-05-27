import { Injectable } from '@viewfly/core'
import {
  distinctUntilChanged,
  filter,
  fromEvent,
  Observable,
  Subject,
  Subscription,
} from '@tanbo/stream'
import {
  Commander,
  CompositionStartEventData,
  CompositionUpdateEventData,
  ContentType,
  Controller,
  Event,
  invokeListener,
  Keyboard,
  Selection,
  Slot,
  Textbus
} from '@textbus/core'

import { Caret, CaretPosition, caretPositionEqual, Input } from './types'
import { VIEW_DOCUMENT } from './injection-tokens'
import { isSafari, isMac, isFirefox } from './_utils/env'
import { Parser } from './parser'
import { getLayoutRectByRange } from './_utils/uikit'
import { DomAdapter } from './dom-adapter'

/**
 * 轻量级 DOM 文本变化记录器，仅在 composition 期间激活。
 * 记录 composition 期间 DOM 中新增/修改的文本节点，在 compositionend 时从 DOM 读取最终文本。
 * 写入模型后清理浏览器创建的新文本节点，避免残留在文档中。
 */
class CompositionRecorder {
  private observer: MutationObserver | null = null
  private nodeOldValues = new Map<Text, string | null>()

  start(target: Node) {
    this.nodeOldValues.clear()
    this.observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList') {
          for (const node of Array.from(m.addedNodes)) {
            if (node.nodeType === Node.TEXT_NODE && !this.nodeOldValues.has(node as Text)) {
              this.nodeOldValues.set(node as Text, null)
            }
          }
        } else if (m.type === 'characterData') {
          const target = m.target as Text
          if (!this.nodeOldValues.has(target)) {
            this.nodeOldValues.set(target, m.oldValue)
          }
        }
      }
    })
    this.observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: true,
    })
  }

  readText(): string {
    let text = ''
    for (const [node, oldValue] of this.nodeOldValues) {
      if (!node.isConnected) continue
      const current = node.textContent || ''
      if (!current) continue
      if (oldValue === null) {
        text += current
      } else {
        text += this.diffText(oldValue, current)
      }
    }
    return text
  }

  /** 移除 composition 期间浏览器创建的文本节点（焦点处），光标位置不可能被协作触及 */
  cleanup(committedText: string, focusNode: Node | null) {
    if (focusNode instanceof Text &&
        focusNode.isConnected &&
        focusNode.textContent === committedText &&
        this.nodeOldValues.has(focusNode as Text) &&
        focusNode.parentNode) {
      focusNode.parentNode.removeChild(focusNode)
    }
    this.nodeOldValues.clear()
  }

  stop() {
    this.observer?.disconnect()
    this.observer = null
  }

  private diffText(oldStr: string, newStr: string): string {
    let start = 0
    while (start < oldStr.length && start < newStr.length && oldStr[start] === newStr[start]) {
      start++
    }
    let oldEnd = oldStr.length - 1
    let newEnd = newStr.length - 1
    while (oldEnd >= start && newEnd >= start && oldStr[oldEnd] === newStr[newEnd]) {
      oldEnd--
      newEnd--
    }
    return newStr.slice(start, newEnd + 1)
  }
}

class NativeCaret implements Caret {
  onPositionChange: Observable<CaretPosition | null>

  set nativeRange(range: Range | null) {
    this._nativeRange = range
    if (range) {
      const r = range.cloneRange()
      r.collapse(true)
      const rect = getLayoutRectByRange(r)
      this.positionChangeEvent.next({
        left: rect.left,
        top: rect.top,
        height: rect.height
      })
    } else {
      this.positionChangeEvent.next(null)
    }
  }

  get nativeRange() {
    return this._nativeRange
  }

  get rect() {
    if (this.nativeRange) {
      const range = this.nativeRange.cloneRange()
      range.collapse(true)
      return getLayoutRectByRange(range)
    }
    return {
      left: 0,
      top: 0,
      width: 0,
      height: 0
    }
  }

  private _nativeRange: Range | null = null
  private subs: Subscription[] = []

  private positionChangeEvent = new Subject<CaretPosition | null>()

  constructor() {
    this.onPositionChange = this.positionChangeEvent.pipe(distinctUntilChanged(caretPositionEqual))
  }

  refresh() {
    //
  }

  destroy() {
    this.subs.forEach(i => i.unsubscribe())
    this.subs = []
  }
}

@Injectable()
export class NativeInput extends Input {
  caret = new NativeCaret()

  composition = false
  // compositionState: CompositionState | null = null

  onReady = Promise.resolve()

  set disabled(b: boolean) {
    this._disabled = b
    if (this.controller.readonly) {
      this.documentView.contentEditable = 'false'
      return
    }
    this.documentView.contentEditable = b ? 'false' : 'true'
  }

  get disabled() {
    return this._disabled
  }

  private _disabled = false
  private documentView: HTMLElement
  private nativeSelection = document.getSelection()!

  private subscription = new Subscription()
  private nativeRange: Range | null = null

  private isSafari = isSafari()
  private isMac = isMac()
  private compositionEndedAt = 0

  constructor(textbus: Textbus,
              private parser: Parser,
              private selection: Selection,
              private keyboard: Keyboard,
              private domAdapter: DomAdapter,
              private commander: Commander,
              private controller: Controller) {
    super()
    this.documentView = textbus.get(VIEW_DOCUMENT)
    if (!controller.readonly) {
      this.documentView.contentEditable = 'true'
    }
    this.subscription.add(
      controller.onReadonlyStateChange.subscribe(() => {
        this.documentView.contentEditable = controller.readonly ? 'false' : 'true'
      })
    )
    this.handleShortcut(this.documentView)
    this.handleInput(this.documentView)
    this.handleDefaultActions(this.documentView)
  }

  focus(nativeRange: Range) {
    if (this.controller.readonly) {
      return
    }
    this.caret.nativeRange = nativeRange
    this.nativeRange = nativeRange
  }

  blur() {
    if (this.nativeRange && this.nativeSelection.rangeCount > 0) {
      const current = this.nativeSelection.getRangeAt(0)
      if (current === this.nativeRange) {
        this.nativeSelection.removeAllRanges()
        this.nativeRange = null
        return
      }
    }
  }

  destroy() {
    this.caret.destroy()
    this.subscription.unsubscribe()
  }

  private handleDefaultActions(textarea: HTMLElement) {
    this.subscription.add(
      fromEvent<ClipboardEvent>(isFirefox() ? textarea : document, 'copy').subscribe(ev => {
        this.copyHandler(ev)
      }),
      fromEvent<ClipboardEvent>(textarea, 'paste').subscribe(ev => {
        this.pasteHandler(ev)
      })
    )
  }

  copyHandler(ev: ClipboardEvent) {
    const selection = this.selection
    if (!selection.isSelected) {
      return
    }
    if (selection.startSlot === selection.endSlot && selection.endOffset! - selection.startOffset! === 1) {
      const content = selection.startSlot!.getContentAtIndex(selection.startOffset!)
      if (typeof content === 'object') {
        const clipboardData = ev.clipboardData!
        const nativeSelection = document.getSelection()!
        const range = nativeSelection.getRangeAt(0)
        const div = document.createElement('div')
        const fragment = range.cloneContents()
        div.append(fragment)
        clipboardData.setData('text/html', div.innerHTML)
        clipboardData.setData('text', div.innerText)
        ev.preventDefault()
      }
    }
  }

  pasteHandler(ev: ClipboardEvent) {
    const text = ev.clipboardData!.getData('Text')

    const types = Array.from(ev.clipboardData!.types || [])
    const files = Array.from(ev.clipboardData!.files)
    if (types.every(type => type === 'Files') && files.length) {
      Promise.all(files.filter(i => {
        return /image/i.test(i.type)
      }).map(item => {
        const reader = new FileReader()
        return new Promise(resolve => {
          reader.onload = (event) => {
            resolve(event.target!.result)
          }
          reader.readAsDataURL(item)
        })
      })).then(urls => {
        const html = urls.map(i => {
          return `<img src=${i}>`
        }).join('')
        this.paste(html, text)
      })
      ev.preventDefault()
      return
    }

    const div = document.createElement('div')
    div.style.cssText = 'width:1px; height:10px; overflow: hidden; position: fixed; left: 50%; top: 50%; opacity:0'
    div.contentEditable = 'true'
    document.body.appendChild(div)
    div.focus()
    setTimeout(() => {
      document.body.removeChild(div)
      div.style.cssText = ''
      this.paste(div, text)
    })
  }

  private paste(dom: HTMLElement | string, text: string) {
    const slot = this.parser.parse(dom, new Slot([
      ContentType.BlockComponent,
      ContentType.InlineComponent,
      ContentType.Text
    ]))

    this.commander.paste(slot, text)
  }

  private handleShortcut(input: HTMLElement) {
    this.subscription.add(
      fromEvent<KeyboardEvent>(input, 'keydown').pipe(filter(() => {
        // Safari: IME 确认键（Enter）会在 compositionend 后紧接着触发 keydown
        // 用时间戳窗口检测并忽略
        if (this.isSafari && this.compositionEndedAt > 0 &&
            Date.now() - this.compositionEndedAt < 500) {
          this.compositionEndedAt = 0
          return false
        }
        return !this.composition
      })).subscribe(ev => {
        let key = ev.key
        const keys = ')!@#$%^Z&*('
        const b = key === 'Process' && /Digit\d/.test(ev.code) && ev.shiftKey
        if (b) {
          key = keys.charAt(+ev.code.substring(5))
          ev.preventDefault()
        }
        const is = this.keyboard.execShortcut({
          key: key,
          altKey: ev.altKey,
          shiftKey: ev.shiftKey,
          modKey: this.isMac ? ev.metaKey : ev.ctrlKey,
          agent: {
            key: ev.key,
            keyCode: ev.keyCode,
            code: ev.code
          }
        })
        if (is) {
          ev.preventDefault()
        }
      })
    )
  }

  private handleInput(input: HTMLElement) {
    const recorder = new CompositionRecorder()
    let startIndex = 0

    this.subscription.add(
      // ===== Composition 事件：纯开关，不读 ev.data 做模型决策 =====
      fromEvent(input, 'compositionstart').subscribe(() => {
        this.composition = true
        recorder.start(input)
        startIndex = this.selection.startOffset!
        const startSlot = this.selection.startSlot!
        const event = new Event<Slot, CompositionStartEventData>(startSlot, {
          index: startIndex
        })
        invokeListener(startSlot.parent!, 'onCompositionStart', event)
      }),

      fromEvent<CompositionEvent>(input, 'compositionupdate').subscribe(ev => {
        const startSlot = this.selection.startSlot
        if (startSlot) {
          invokeListener(startSlot.parent!, 'onCompositionUpdate',
            new Event(startSlot, {
              index: startIndex,
              data: ev.data
            }))
        }
      }),

      fromEvent(input, 'compositionend').subscribe(() => {
        if (!this.composition) return
        this.composition = false
        this.compositionEndedAt = Date.now()

        // Safari: WebKit 在 compositionend 之后才更新 DOM，通过 microtask 延迟读取
        if (this.isSafari) {
          queueMicrotask(() => this.syncCompositionText(recorder))
        } else {
          this.syncCompositionText(recorder)
        }
      }),

      // ===== beforeinput：仅处理非 IME 输入 =====
      fromEvent<InputEvent>(input, 'beforeinput').subscribe(ev => {
        if (ev.isComposing || this.composition) {
          return
        }

        ev.preventDefault()

        switch (ev.inputType) {
          case 'insertText':
            if (ev.data) {
              this.commander.write(ev.data)
            }
            break
          case 'deleteContentBackward':
            this.commander.delete(true)
            break
          case 'deleteContentForward':
            this.commander.delete()
            break
          case 'insertReplacementText': {
            const range = ev.getTargetRanges()[0]
            if (range) {
              const location = this.domAdapter.getLocationByNativeNode(range.startContainer)
              if (location) {
                const startSlot = this.selection.startSlot!
                this.selection.setBaseAndExtent(
                  startSlot,
                  location.startIndex + range.startOffset,
                  startSlot,
                  location.startIndex + range.endOffset)
                this.commander.delete()
              }
            }
            const text = ev.dataTransfer?.getData('text') || ev.data
            if (text) {
              this.commander.write(text)
            }
            break
          }
        }
      })
    )
  }

  private syncCompositionText(recorder: CompositionRecorder) {
    const text = recorder.readText()
    recorder.stop()

    if (text) {
      // 先清理 composition 期间浏览器创建的节点，确保写入模型时 DOM 是干净的
      recorder.cleanup(text, this.nativeSelection.focusNode)
      this.commander.write(text)
    }

    const startSlot = this.selection.startSlot
    if (startSlot) {
      invokeListener(startSlot.parent!, 'onCompositionEnd', new Event<Slot>(startSlot, null))
    }
  }
}
