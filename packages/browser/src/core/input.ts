import { filter, fromEvent, map, merge, Observable, Subscription } from '@tanbo/stream'
import { Injectable } from '@tanbo/di'
import {
  Commander,
  ContentType,
  Keyboard,
  Selection,
  Slot
} from '@textbus/core'

import { createElement } from '../_utils/uikit'
import { Parser } from '../dom-support/parser'
import { Caret } from './caret'
import { isMac, isSafari, isWindows } from '../_utils/env'

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

/**
 * Textbus PC 端输入实现
 */
@Injectable()
export class Input {
  onReady: Promise<void>
  private container = Input.createEditableFrame()

  private subscription = new Subscription()
  private doc!: Document

  private textarea: HTMLTextAreaElement | null = null

  private isFocus = false
  //
  // private inputFormatterId = '__TextbusInputFormatter__'
  //
  // private inputFormatter: AttributeFormatter = {
  //   name: this.inputFormatterId,
  //   type: FormatType.Attribute,
  //   render: () => {
  //     return jsx('span', {
  //       'data-writing-format': this.inputFormatterId,
  //       style: {
  //         textDecoration: 'underline'
  //       }
  //     })
  //   }
  // }
  private nativeFocus = false

  constructor(private parser: Parser,
              private keyboard: Keyboard,
              private commander: Commander,
              private selection: Selection,
              private caret: Caret) {
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
        })
      )
    })

    caret.elementRef.append(this.container)
  }

  focus() {
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
    this.textarea?.blur()
    this.isFocus = false
  }

  destroy() {
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
        if (isSafari) {
          if (ev.inputType === 'insertFromComposition') {
            isIgnore = true
          }
        }
      }),
      fromEvent<KeyboardEvent>(textarea, 'keydown').pipe(filter(() => {
        if (isSafari && isIgnore) {
          isIgnore = false
          return false
        }
        return !isWriting // || !this.textarea.value
      })).subscribe(ev => {
        const is = this.keyboard.execShortcut({
          key: ev.key,
          altKey: ev.altKey,
          shiftKey: ev.shiftKey,
          ctrlKey: isMac ? ev.metaKey : ev.ctrlKey
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
            if (isSafari) {
              return ev.inputType === 'insertText' || ev.inputType === 'insertFromComposition'
            }
            return !ev.isComposing && !!ev.data
          }),
          map(ev => {
            return ev.data as string
          })
        ),
        isSafari ? new Observable<string>() : fromEvent<CompositionEvent>(textarea, 'compositionend').pipe(map(ev => {
          ev.preventDefault()
          textarea.value = ''
          return ev.data
        }))
      ).subscribe(text => {
        if (text) {
          this.commander.write(text)
        }
      })
    )
  }

  // private handleInput(textarea: HTMLTextAreaElement) {
  //   let index: number
  //   let offset = 0
  //   let formats: Formats = []
  //   this.subscription.add(
  //     fromEvent<InputEvent>(textarea, 'beforeinput').pipe(
  //       filter(ev => {
  //         ev.preventDefault()
  //         if (isSafari) {
  //           return ev.inputType === 'insertText'
  //           // return ev.inputType === 'insertText' || ev.inputType === 'insertFromComposition'
  //         }
  //         return !ev.isComposing && !!ev.data
  //       }),
  //       map(ev => {
  //         return ev.data as string
  //       })
  //     ).subscribe(text => {
  //       if (text) {
  //         this.commander.write(text)
  //       }
  //     }),
  //     fromEvent(textarea, 'compositionstart').subscribe(() => {
  //       const startSlot = this.selection.startSlot!
  //       formats = startSlot.extractFormatsByIndex(this.selection.startOffset!)
  //       formats.push([this.inputFormatter, true])
  //       this.commander.write('')
  //       index = this.selection.startOffset!
  //     }),
  //     fromEvent<CompositionEvent>(textarea, 'compositionupdate').subscribe((ev) => {
  //       const text = ev.data
  //       const startSlot = this.selection.startSlot!
  //       this.selection.setBaseAndExtent(startSlot, index, startSlot, index + offset)
  //       this.commander.insert(text, formats)
  //       offset = text.length
  //     }),
  //     fromEvent<CompositionEvent>(textarea, 'compositionend').subscribe((ev) => {
  //       textarea.value = ''
  //       const startSlot = this.selection.startSlot!
  //       this.selection.setBaseAndExtent(startSlot, index, startSlot, index + offset)
  //       this.commander.insert(ev.data, formats.filter(i => i[0] !== this.inputFormatter))
  //       offset = 0
  //     })
  //   )
  // }

  private static createEditableFrame() {
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
        top: isWindows ? '6px' : '0'
      }
    }) as HTMLIFrameElement
  }
}
