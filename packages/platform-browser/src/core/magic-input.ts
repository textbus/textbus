import { distinctUntilChanged, filter, fromEvent, map, merge, Observable, Subject, Subscription } from '@tanbo/stream'
import { Injectable, Injector } from '@tanbo/di'
import {
  Commander,
  ContentType,
  Controller,
  Keyboard,
  Scheduler,
  Selection,
  Slot
} from '@textbus/core'

import { createElement, getLayoutRectByRange } from '../_utils/uikit'
import { Parser } from '../dom-support/parser'
import { isMac, isSafari, isWindows } from '../_utils/env'
import { VIEW_MASK } from './injection-tokens'
import { Caret, CaretPosition, Input, Scroller } from './types'

const iframeHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Textbus</title>
  <style>
    html {position: fixed; left:0; overflow: hidden}
    html, body{height: 100%;width:100%}
    body{margin:0; overflow: hidden}
    textarea{width: 2000px;height: 100%;opacity: 0; padding: 0; outline: none; border: none; position: absolute; left:0; top:0;}
  </style>
</head>
<body>
</body>
</html>
`

interface CaretStyle {
  height: string
  lineHeight: string
  fontSize: string
}


class ExperimentalCaret implements Caret {
  onPositionChange: Observable<CaretPosition | null>
  onStyleChange: Observable<CaretStyle>
  elementRef: HTMLElement

  get rect() {
    return this.caret.getBoundingClientRect()
  }

  private timer: any = null
  private caret: HTMLElement
  private oldPosition: CaretPosition | null = null

  private set display(v: boolean) {
    this._display = v
    this.caret.style.visibility = v ? 'visible' : 'hidden'
  }

  private get display() {
    return this._display
  }

  private _display = true
  private flashing = true

  private subs: Subscription[] = []

  private positionChangeEvent = new Subject<CaretPosition | null>()
  private styleChangeEvent = new Subject<CaretStyle>()
  private oldRange: Range | null = null

  private isFixed = false

  constructor(
    private scheduler: Scheduler,
    private editorMask: HTMLElement) {
    this.onPositionChange = this.positionChangeEvent.pipe(distinctUntilChanged())
    this.onStyleChange = this.styleChangeEvent.asObservable()
    this.elementRef = createElement('div', {
      styles: {
        position: 'absolute',
        width: '2px',
        pointerEvents: 'none'
      },
      children: [
        this.caret = createElement('span', {
          styles: {
            width: '100%',
            height: '100%',
            position: 'absolute',
            left: 0,
            top: 0
          }
        })
      ]
    })

    this.subs.push(
      fromEvent(document, 'mousedown').subscribe(() => {
        this.flashing = false
      }),
      fromEvent(document, 'mouseup').subscribe(() => {
        this.flashing = true
      }),
    )
    this.editorMask.appendChild(this.elementRef)
  }

  refresh(isFixedCaret = false) {
    this.isFixed = isFixedCaret
    if (this.oldRange) {
      this.show(this.oldRange, false)
    }
    this.isFixed = false
  }

  show(range: Range, restart: boolean) {
    const oldRect = this.elementRef.getBoundingClientRect()
    this.oldPosition = {
      top: oldRect.top,
      left: oldRect.left,
      height: oldRect.height
    }
    this.oldRange = range
    if (restart || this.scheduler.lastChangesHasLocalUpdate) {
      clearTimeout(this.timer)
    }
    this.updateCursorPosition(range)
    if (range.collapsed) {
      if (restart || this.scheduler.lastChangesHasLocalUpdate) {
        this.display = true
        const toggleShowHide = () => {
          this.display = !this.display || !this.flashing
          this.timer = setTimeout(toggleShowHide, 400)
        }
        clearTimeout(this.timer)
        this.timer = setTimeout(toggleShowHide, 400)
      }
    } else {
      this.display = false
      clearTimeout(this.timer)
    }
  }

  hide() {
    this.display = false
    clearTimeout(this.timer)
    this.positionChangeEvent.next(null)
  }

  destroy() {
    clearTimeout(this.timer)
    this.subs.forEach(i => i.unsubscribe())
  }

  correctScrollTop(scroller: Scroller) {
    this.subs.forEach(i => i.unsubscribe())
    this.subs = []
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
            if (this.isFixed && this.oldPosition) {
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

  private updateCursorPosition(nativeRange: Range) {
    const startContainer = nativeRange.startContainer

    const node = (startContainer.nodeType === Node.ELEMENT_NODE ? startContainer : startContainer.parentNode) as HTMLElement
    if (node?.nodeType !== Node.ELEMENT_NODE || !nativeRange.collapsed) {
      this.positionChangeEvent.next(null)
      return
    }
    const rect = getLayoutRectByRange(nativeRange)
    const { fontSize, lineHeight, color } = getComputedStyle(node)

    let height: number
    if (isNaN(+lineHeight)) {
      const f = parseFloat(lineHeight)
      if (isNaN(f)) {
        height = parseFloat(fontSize)
      } else {
        height = f
      }
    } else {
      height = parseFloat(fontSize) * parseFloat(lineHeight)
    }

    const boxHeight = Math.floor(Math.max(height, rect.height))
    // const boxHeight = Math.floor(height)

    let rectTop = rect.top
    if (rect.height < height) {
      rectTop -= (height - rect.height) / 2
    }

    rectTop = Math.floor(rectTop)

    const containerRect = this.editorMask.getBoundingClientRect()

    const top = Math.floor(rectTop - containerRect.top)
    const left = Math.floor(rect.left - containerRect.left)

    Object.assign(this.elementRef.style, {
      left: left + 'px',
      top: top + 'px',
      height: boxHeight + 'px',
      lineHeight: boxHeight + 'px',
      fontSize
    })

    this.caret.style.backgroundColor = color
    this.styleChangeEvent.next({
      height: boxHeight + 'px',
      lineHeight: boxHeight + 'px',
      fontSize
    })
    this.positionChangeEvent.next({
      left,
      top: rectTop,
      height: boxHeight
    })
  }
}


/**
 * Textbus PC 端输入实现
 */
@Injectable()
export class MagicInput extends Input {
  composition = false
  onReady: Promise<void>
  caret = new ExperimentalCaret(this.scheduler, this.injector.get(VIEW_MASK))
  private container = this.createEditableFrame()

  private subscription = new Subscription()
  private doc!: Document

  private textarea: HTMLTextAreaElement | null = null

  private isFocus = false
  private nativeFocus = false

  private isSafari = isSafari()
  private isMac = isMac()
  private isWindows = isWindows()

  private isSougouPinYin = false // 有 bug 版本搜狗拼音

  constructor(private parser: Parser,
              private keyboard: Keyboard,
              private commander: Commander,
              private selection: Selection,
              private controller: Controller,
              private scheduler: Scheduler,
              private injector: Injector) {
    super()
    this.onReady = new Promise<void>(resolve => {
      this.subscription.add(
        fromEvent(this.container, 'load').subscribe(() => {
          const doc = this.container.contentDocument!
          doc.open()
          doc.write(iframeHTML)
          doc.close()
          this.doc = doc
          this.init()
          resolve()
        }),
        controller.onReadonlyStateChange.subscribe(() => {
          if (controller.readonly) {
            this.blur()
          }
        })
      )
    })

    this.caret.elementRef.append(this.container)
  }

  focus(range: Range, restart: boolean) {
    this.caret.show(range, restart)
    if (this.controller.readonly) {
      return
    }
    if (!this.isFocus) {
      this.textarea?.focus()
      setTimeout(() => {
        if (!this.nativeFocus && this.isFocus) {
          this.subscription.unsubscribe()
          this.textarea?.parentNode?.removeChild(this.textarea)
          this.subscription = new Subscription()
          this.init()
          this.textarea?.focus()
        }
      })
    }
    this.isFocus = true
  }

  blur() {
    this.caret.hide()
    this.textarea?.blur()
    this.isFocus = false
  }

  destroy() {
    this.caret.destroy()
    this.subscription.unsubscribe()
  }

  private init() {
    const doc = this.doc
    const contentBody = doc.body
    const textarea = doc.createElement('textarea')
    contentBody.appendChild(textarea)
    this.textarea = textarea
    this.subscription.add(
      fromEvent(textarea, 'blur').subscribe(() => {
        this.isFocus = false
        this.nativeFocus = false
        this.caret.hide()
      }),
      fromEvent(textarea, 'focus').subscribe(() => {
        this.nativeFocus = true
      }),
      this.caret.onStyleChange.subscribe(style => {
        Object.assign(textarea.style, style)
      })
    )
    this.handleInput(textarea)
    this.handleShortcut(textarea)
    this.handleDefaultActions(textarea)
  }

  private handleDefaultActions(textarea) {
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

        const div = this.doc.createElement('div')
        div.style.cssText = 'width:1px; height:10px; overflow: hidden; position: fixed; left: 50%; top: 50%; opacity:0'
        div.contentEditable = 'true'
        this.doc.body.appendChild(div)
        div.focus()
        setTimeout(() => {
          const html = div.innerHTML
          this.handlePaste(html, text)

          this.doc.body.removeChild(div)
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

  private handleShortcut(textarea: HTMLTextAreaElement) {
    let isWriting = false
    let isIgnore = false
    this.subscription.add(
      fromEvent(textarea, 'compositionstart').subscribe(() => {
        isWriting = true
      }),
      fromEvent(textarea, 'compositionend').subscribe(() => {
        isWriting = false
      }),
      fromEvent<InputEvent>(textarea, 'beforeinput').subscribe(ev => {
        if (this.isSafari) {
          if (ev.inputType === 'insertFromComposition') {
            isIgnore = true
          }
        }
      }),
      fromEvent<KeyboardEvent>(textarea, 'keydown').pipe(filter(() => {
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
          this.isSougouPinYin = true
          ev.preventDefault()
        }
        const is = this.keyboard.execShortcut({
          key: key,
          altKey: ev.altKey,
          shiftKey: ev.shiftKey,
          ctrlKey: this.isMac ? ev.metaKey : ev.ctrlKey
        })
        if (is) {
          ev.preventDefault()
        }
      })
    )
  }

  private handleInput(textarea: HTMLTextAreaElement) {
    this.subscription.add(
      merge(
        fromEvent<InputEvent>(textarea, 'beforeinput').pipe(
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
        this.isSafari ? new Observable<string>() : fromEvent<CompositionEvent>(textarea, 'compositionend').pipe(
          map(ev => {
            ev.preventDefault()
            textarea.value = ''
            return ev.data
          }),
          filter(() => {
            const b = this.isSougouPinYin
            this.isSougouPinYin = false
            return !b
          })
        )
      ).subscribe(text => {
        if (text) {
          this.commander.write(text)
        }
      })
    )
  }

  private createEditableFrame() {
    return createElement('iframe', {
      attrs: {
        scrolling: 'no'
      },
      styles: {
        border: 'none',
        width: '100%',
        display: 'block',
        height: '100%',
        position: 'relative',
        top: this.isWindows ? '6px' : '0'
      }
    }) as HTMLIFrameElement
  }
}
