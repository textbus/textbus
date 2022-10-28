import { Injectable, Injector } from '@tanbo/di'
import { filter, fromEvent, map, merge, Observable, Subject, Subscription } from '@tanbo/stream'
import { Commander, ContentType, Controller, Keyboard, Scheduler, Selection, Slot } from '@textbus/core'

import { Caret, CaretPosition, Input, Scroller } from './types'
import { VIEW_DOCUMENT } from './injection-tokens'
import { isSafari, isMac } from '../_utils/env'
import { Parser } from '../dom-support/parser'


class NativeCaret implements Caret {
  onPositionChange = new Subject<CaretPosition | null>()

  set nativeRange(range: Range | null) {
    this._nativeRange = range
    if (range && range.collapsed) {
      this.onPositionChange.next(range.getBoundingClientRect())
    }
  }

  get nativeRange() {
    return this._nativeRange
  }

  get rect() {
    if (this.nativeRange) {
      return this.nativeRange.getBoundingClientRect()
    }
    return {
      left: 0,
      top: 0,
      width: 0,
      height: 0
    }
  }

  private oldPosition: CaretPosition | null = null
  private _nativeRange: Range | null = null
  private subs: Subscription[] = []

  constructor(private scheduler: Scheduler) {
  }

  refresh() {
    //
  }

  correctScrollTop(scroller: Scroller): void {
    this.destroy()
    const scheduler = this.scheduler
    let docIsChanged = true

    function limitPosition(position: CaretPosition) {
      const { top, bottom } = scroller.getLimit()
      const caretTop = position.top
      if (caretTop + position.height > bottom) {
        const offset = caretTop - bottom + position.height
        scroller.setOffset(offset)
      } else if (position.top < top) {
        scroller.setOffset(-(top - position.top))
      }
    }

    let isPressed = false

    this.subs.push(
      scroller.onScroll.subscribe(() => {
        if (this.oldPosition) {
          const rect = this.rect
          this.oldPosition.top = rect.top
          this.oldPosition.left = rect.left
          this.oldPosition.height = rect.height
        }
      }),
      fromEvent(document, 'mousedown', true).subscribe(() => {
        isPressed = true
      }),
      fromEvent(document, 'mouseup', true).subscribe(() => {
        isPressed = false
      }),
      scheduler.onDocChange.subscribe(() => {
        docIsChanged = true
      }),
      this.onPositionChange.subscribe(position => {
        if (position) {
          if (docIsChanged) {
            if (scheduler.lastChangesHasLocalUpdate) {
              limitPosition(position)
            } else if (this.oldPosition) {
              const offset = Math.floor(position.top - this.oldPosition.top)
              scroller.setOffset(offset)
            }
          } else if (!isPressed) {
            if (this.oldPosition) {
              const offset = Math.floor(position.top - this.oldPosition.top)
              scroller.setOffset(offset)
            } else {
              limitPosition(position)
            }
          }
        }
        docIsChanged = false
      })
    )
  }

  destroy() {
    this.subs.forEach(i => i.unsubscribe())
    this.subs = []
  }
}

@Injectable()
export class NativeInput extends Input {
  caret = new NativeCaret(this.scheduler)

  composition = false

  onReady = Promise.resolve()

  private documentView: HTMLElement
  private nativeSelection = document.getSelection()!

  private subscription = new Subscription()
  private nativeRange: Range | null = null

  private isSafari = isSafari()
  private isMac = isMac()

  private isSougouPinYin = false // 有 bug 版本搜狗拼音

  constructor(private injector: Injector,
              private parser: Parser,
              private scheduler: Scheduler,
              private selection: Selection,
              private keyboard: Keyboard,
              private commander: Commander,
              private controller: Controller) {
    super()
    this.documentView = injector.get(VIEW_DOCUMENT)
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
      fromEvent<ClipboardEvent>(document, 'copy').subscribe(ev => {
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

        const files = Array.from(ev.clipboardData!.files)
        if (files.length) {
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
          const html = div.innerHTML
          this.handlePaste(html, text)

          document.body.removeChild(div)
        })
      })
    )
  }

  private handlePaste(html: string, text: string) {
    const slot = this.parser.parse(html, new Slot([
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
        let key = ev.key
        const b = key === 'Process' && ev.code === 'Digit2'
        if (b) {
          key = '@'
        }
        const is = this.keyboard.execShortcut({
          key: key,
          altKey: ev.altKey,
          shiftKey: ev.shiftKey,
          ctrlKey: this.isMac ? ev.metaKey : ev.ctrlKey
        })
        if (is) {
          if (b) {
            this.isSougouPinYin = true
          }
          ev.preventDefault()
        }
      })
    )
  }

  private handleInput(input: HTMLElement) {

    this.subscription.add(
      fromEvent(input, 'compositionstart').subscribe(() => {
        this.composition = true
      }),
      merge(
        fromEvent<InputEvent>(input, 'beforeinput').pipe(
          filter(ev => {
            ev.preventDefault()
            if (this.isSafari) {
              return ev.inputType === 'insertText' || ev.inputType === 'insertFromComposition'
            }
            return !ev.isComposing && !!ev.data
          }),
          map(ev => {
            return ev.data as string
          })
        ),
        this.isSafari ? new Observable<string>() : fromEvent<CompositionEvent>(input, 'compositionend').pipe(
          map(ev => {
            ev.preventDefault()
            return ev.data
          }),
          filter(() => {
            const b = this.isSougouPinYin
            this.isSougouPinYin = false
            return !b
          })
        )
      ).subscribe(text => {
        this.composition = false
        if (text) {
          this.commander.write(text)
        }
      })
    )
  }
}
