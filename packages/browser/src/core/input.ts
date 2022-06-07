import { filter, fromEvent, map, Subscription } from '@tanbo/stream'
import { Injectable } from '@tanbo/di'
import { AttributeFormatter, Commander, ContentType, FormatType, jsx, Keyboard, Selection, Slot } from '@textbus/core'

import { createElement } from '../_utils/uikit'
import { Parser } from '../dom-support/parser'
import { Caret } from './caret'

export const isWindows = /win(dows|32|64)/i.test(navigator.userAgent)
export const isMac = /mac os/i.test(navigator.userAgent)
const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)

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

  private inputFormatterId = '__TextbusInputFormatter__'

  private inputFormatter: AttributeFormatter = {
    name: this.inputFormatterId,
    type: FormatType.Attribute,
    render: () => {
      return jsx('span', {
        'data-writing-format': this.inputFormatterId,
        style: {
          textDecoration: 'underline'
        }
      })
    }
  }

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
          const contentBody = doc.body
          const textarea = doc.createElement('textarea')
          contentBody.appendChild(textarea)
          this.textarea = textarea
          this.subscription.add(
            fromEvent(textarea, 'blur').subscribe(() => {
              this.isFocus = false
              caret.hide()
            }),
            caret.onStyleChange.subscribe(style => {
              Object.assign(textarea.style, style)
            })
          )
          this.handleInput(textarea)
          this.handleShortcut(textarea)
          this.handleDefaultActions(textarea)
          resolve()
        })
      )
    })

    caret.elementRef.append(this.container)
  }

  focus() {
    if (!this.isFocus) {
      this.textarea?.focus()
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

  private handleDefaultActions(textarea) {
    this.subscription.add(
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
        div.style.cssText = 'width:10px; height:10px; overflow: hidden; position: fixed; left: -9999px; top: -9999px; opacity:0'
        div.contentEditable = 'true'
        this.doc.body.appendChild(div)
        div.focus()
        setTimeout(() => {
          let html = div.innerHTML
          let hasEmpty = true
          const reg = /<(?!(?:td|th))(\w+)[^>]*?>\s*?<\/\1>/g
          while (hasEmpty) {
            hasEmpty = false
            html = html.replace(reg, function () {
              hasEmpty = true
              return ''
            })
          }
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
    let index: number
    let offset = 0
    this.subscription.add(
      fromEvent<InputEvent>(textarea, 'beforeinput').pipe(
        filter(ev => {
          ev.preventDefault()
          if (isSafari) {
            return ev.inputType === 'insertText'
            // return ev.inputType === 'insertText' || ev.inputType === 'insertFromComposition'
          }
          return !ev.isComposing && !!ev.data
        }),
        map(ev => {
          return ev.data as string
        })
      ).subscribe(text => {
        if (text) {
          this.commander.write(text)
        }
      }),
      fromEvent(textarea, 'compositionstart').subscribe(() => {
        this.commander.write('')
        index = this.selection.startOffset!
      }),
      fromEvent<CompositionEvent>(textarea, 'compositionupdate').subscribe((ev) => {
        const startSlot = this.selection.startSlot!
        this.selection.setBaseAndExtent(startSlot, index, startSlot, index + offset)
        this.commander.write(ev.data, this.inputFormatter, true)
        offset = ev.data.length
      }),
      fromEvent<CompositionEvent>(textarea, 'compositionend').subscribe((ev) => {
        ev.preventDefault()
        textarea.value = ''
        const startSlot = this.selection.startSlot!
        startSlot.applyFormat(this.inputFormatter, {
          startIndex: 0,
          endIndex: startSlot.length,
          value: null
        })
        this.selection.setBaseAndExtent(startSlot, index, startSlot, index + offset)
        this.commander.write(ev.data)
        offset = 0
      })
    )
    // this.subscription.add(
    //   merge(
    //     fromEvent<InputEvent>(textarea, 'beforeinput').pipe(
    //       filter(ev => {
    //         ev.preventDefault()
    //         if (isSafari) {
    //           return ev.inputType === 'insertText' || ev.inputType === 'insertFromComposition'
    //         }
    //         return !ev.isComposing && !!ev.data
    //       }),
    //       map(ev => {
    //         return ev.data as string
    //       })
    //     ),
    //     isSafari ? new Observable<string>() : fromEvent<CompositionEvent>(textarea, 'compositionend').pipe(map(ev => {
    //       ev.preventDefault()
    //       textarea.value = ''
    //       return ev.data
    //     }))
    //   ).subscribe(text => {
    //     if (text) {
    //       this.commander.write(text)
    //     }
    //   })
    // )
  }

  private static createEditableFrame() {
    return createElement('iframe', {
      attrs: {
        scrolling: 'no'
      },
      styles: {
        border: 'none',
        width: '100%',
        display: 'block',
        height: '100%'
      }
    }) as HTMLIFrameElement
  }
}
