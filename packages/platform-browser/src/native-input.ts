import { Injectable } from '@viewfly/core'
import {
  distinctUntilChanged,
  filter,
  fromEvent,
  map,
  merge,
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

import { Caret, CaretPosition, Input } from './types'
import { VIEW_DOCUMENT } from './injection-tokens'
import { isSafari, isMac, isMobileBrowser, isFirefox } from './_utils/env'
import { Parser } from './parser'
import { getLayoutRectByRange } from './_utils/uikit'
import { DomAdapter } from './dom-adapter'

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
    this.onPositionChange = this.positionChangeEvent.pipe(distinctUntilChanged())
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
  private isMobileBrowser = isMobileBrowser()

  private ignoreComposition = false // 有 bug 版本搜狗拼音

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

      }),
      fromEvent<ClipboardEvent>(textarea, 'paste').subscribe(ev => {
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
            this.handlePaste(html, text)
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
          this.handlePaste(div, text)
        })
      })
    )
  }

  private handlePaste(dom: HTMLElement | string, text: string) {
    const slot = this.parser.parse(dom, new Slot([
      ContentType.BlockComponent,
      ContentType.InlineComponent,
      ContentType.Text
    ]))

    this.commander.paste(slot, text)
  }

  private handleShortcut(input: HTMLElement) {
    let isWriting = false
    let isIgnore = false
    this.subscription.add(
      fromEvent(input, 'compositionstart').subscribe(() => {
        isWriting = true
      }),
      fromEvent(input, 'compositionend').subscribe(() => {
        isWriting = false
      }),
      fromEvent<InputEvent>(input, 'beforeinput').subscribe(ev => {
        if (this.isSafari) {
          if (ev.inputType === 'insertFromComposition') {
            isIgnore = true
          }
        }
      }),
      fromEvent<KeyboardEvent>(input, 'keydown').pipe(filter(() => {
        if (this.isSafari && isIgnore) {
          isIgnore = false
          return false
        }
        return !isWriting // || !this.textarea.value
      })).subscribe(ev => {
        this.ignoreComposition = false
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
          this.ignoreComposition = true
          ev.preventDefault()
        }
      })
    )
  }

  private handleInput(input: HTMLElement) {
    if (this.isMobileBrowser) {
      this.handleMobileInput(input)
    } else {
      this.handlePCInput(input)
    }
  }

  private handleMobileInput(input: HTMLElement) {
    let isCompositionStart = true
    let startIndex: number
    const compositionStart = () => {
      this.composition = true
      startIndex = this.selection.startOffset!
      const startSlot = this.selection.startSlot!
      const event = new Event<Slot, CompositionStartEventData>(startSlot, {
        index: startIndex
      })
      invokeListener(startSlot.parent!, 'onCompositionStart', event)
    }
    const compositionUpdate = (data: string) => {
      const startSlot = this.selection.startSlot!
      const event = new Event<Slot, CompositionUpdateEventData>(startSlot, {
        index: startIndex,
        data
      })

      invokeListener(startSlot.parent!, 'onCompositionUpdate', event)
    }
    const compositionEnd = (data: string) => {
      this.composition = false

      if (data) {
        this.commander.write(data)
      }
      const startSlot = this.selection.startSlot
      if (startSlot) {
        const event = new Event<Slot>(startSlot, null)
        invokeListener(startSlot.parent!, 'onCompositionEnd', event)
      }
    }
    this.subscription.add(
      fromEvent(input, 'compositionstart').subscribe(() => {
        compositionStart()
      }),
      fromEvent<CompositionEvent>(input, 'compositionupdate').subscribe(ev => {
        compositionUpdate(ev.data)
      }),
      fromEvent<CompositionEvent>(input, 'compositionend').subscribe(ev => {
        compositionEnd(ev.data)
        const startContainer = this.nativeSelection.focusNode
        if (startContainer instanceof Text && startContainer.textContent === ev.data) {
          startContainer.remove()
        }
      }),
      fromEvent<InputEvent>(input, 'beforeinput').subscribe(ev => {
        switch (ev.inputType) {
          case 'insertText':
            if (ev.data) {
              this.commander.write(ev.data)
              ev.preventDefault()
            }
            break
          case 'insertCompositionText':
            if (isCompositionStart) {
              isCompositionStart = false
              compositionStart()
            } else {
              compositionUpdate(ev.data || '')
            }
            break
          case 'deleteCompositionText':
            this.composition = false
            break
          case 'deleteContentBackward': {
            this.composition = false
            const range = ev.getTargetRanges()[0]
            if (!range) {
              break
            }
            const location = this.domAdapter.getLocationByNativeNode(range.startContainer)!
            const startSlot = this.selection.startSlot
            if (startSlot) {
              this.selection.setBaseAndExtent(
                startSlot,
                location.startIndex + range.startOffset,
                startSlot,
                location.startIndex + range.endOffset)

              this.commander.delete()
            }
            break
          }
          case 'insertReplacementText': {
            this.composition = false
            const range = ev.getTargetRanges()[0]
            const location = this.domAdapter.getLocationByNativeNode(range.startContainer)!
            const startSlot = this.selection.startSlot!
            this.selection.setBaseAndExtent(
              startSlot,
              location.startIndex + range.startOffset,
              startSlot,
              location.startIndex + range.endOffset)

            this.commander.delete()
            const text = ev.dataTransfer?.getData('text') || ev.data || null
            if (text) {
              this.commander.write(text)
            }
            break
          }
          //
          // case 'insertFromComposition': {
          //   compositionEnd(ev.data || '')
          //   break
          // }
        }
      })
    )
  }

  private handlePCInput(input: HTMLElement) {
    let startIndex = 0
    let isCompositionEnd = false
    this.subscription.add(
      fromEvent(input, 'compositionstart').pipe(filter(() => {
        return !this.ignoreComposition
      })).subscribe(() => {
        this.composition = true
        startIndex = this.selection.startOffset!
        const startSlot = this.selection.startSlot!
        const event = new Event<Slot, CompositionStartEventData>(startSlot, {
          index: startIndex
        })
        invokeListener(startSlot.parent!, 'onCompositionStart', event)
      }),
      fromEvent<CompositionEvent>(input, 'compositionupdate').pipe(filter(() => {
        return !this.ignoreComposition
      })).subscribe(ev => {
        const startSlot = this.selection.startSlot!
        const event = new Event(startSlot, {
          index: startIndex,
          data: ev.data
        })

        invokeListener(startSlot.parent!, 'onCompositionUpdate', event)
      }),
      merge(
        fromEvent<InputEvent>(input, 'beforeinput').pipe(
          map(ev => {
            ev.preventDefault()
            if (ev.inputType === 'insertCompositionText') {
              return null
            }
            if (ev.inputType === 'insertReplacementText') {
              const range = ev.getTargetRanges()[0]
              const location = this.domAdapter.getLocationByNativeNode(range.startContainer)!
              const startSlot = this.selection.startSlot!
              this.selection.setBaseAndExtent(
                startSlot,
                location.startIndex + range.startOffset,
                startSlot,
                location.startIndex + range.endOffset)

              this.commander.delete()
              return ev.dataTransfer?.getData('text') || ev.data || null
            }
            isCompositionEnd = ev.inputType === 'insertFromComposition'
            if (isCompositionEnd && this.composition) {
              return null
            }
            if (this.isSafari) {
              if (ev.inputType === 'insertText' || isCompositionEnd) {
                return ev.data
              }
            }
            if (!ev.isComposing && !!ev.data) {
              return ev.data
            }
            return null
          }),
          filter(text => {
            return text
          })
        ),
        this.isSafari ? new Observable<string>() :
          fromEvent<CompositionEvent>(input, 'compositionend').pipe(filter(() => {
            return !this.ignoreComposition
          })).pipe(
            filter(() => {
              return this.composition
            }),
            map(ev => {
              isCompositionEnd = true
              ev.preventDefault()
              return ev.data
            }),
            filter(() => {
              const b = this.ignoreComposition
              this.ignoreComposition = false
              return !b
            })
          )
      ).subscribe(text => {
        this.composition = false
        if (text) {
          const startContainer = this.nativeSelection.focusNode
          if (startContainer instanceof Text && startContainer.textContent === text) {
            startContainer.remove()
          }
          this.commander.write(text)
        }
        if (isCompositionEnd) {
          const startSlot = this.selection.startSlot
          if (startSlot) {
            const event = new Event<Slot>(startSlot, null)
            invokeListener(startSlot.parent!, 'onCompositionEnd', event)
          }
        }
        isCompositionEnd = false
      })
    )
  }
}
