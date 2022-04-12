import { filter, fromEvent, map, merge, Subscription } from '@tanbo/stream'
import { Injectable } from '@tanbo/di'
import { Commander, ContentType, Keyboard, Slot, Selection } from '@textbus/core'

import { createElement } from '../_utils/uikit'
import { SelectionBridge } from './selection-bridge'
import { Parser } from '../dom-support/parser'

export const isWindows = /win(dows|32|64)/i.test(navigator.userAgent)
export const isMac = /mac os/i.test(navigator.userAgent)

/**
 * Textbus PC 端输入实现
 */
@Injectable()
export class Input {
  private container = Input.createEditableFrame()

  private subscriptions: Subscription[] = []
  private doc!: Document

  constructor(private parser: Parser,
              private keyboard: Keyboard,
              private commander: Commander,
              private selection: Selection,
              private selectionBridge: SelectionBridge) {

    selectionBridge.caret.elementRef.append(this.container)
    let isFocus = false
    let textarea: HTMLTextAreaElement | null = null

    this.subscriptions.push(
      fromEvent(this.container, 'load').subscribe(() => {
        const doc = this.container.contentDocument!
        this.doc = doc
        const contentBody = doc.body
        const t = doc.createElement('textarea')
        contentBody.appendChild(t)
        textarea = t
        Object.assign(textarea.style, {
          width: '2000px',
          height: '100%',
          opacity: 0,
          padding: 0,
          border: 'none',
          outline: 'none',
          position: 'absolute',
          fontSize: 'inherit',
          lineHeight: 1,
          left: 0,
          top: isWindows ? '16px' : 0
        })
        fromEvent(textarea, 'blur').subscribe(() => {
          isFocus = false
          selectionBridge.caret.hide()
        })
        this.handleInput(textarea)
        this.handleShortcut(textarea)
        this.handleDefaultActions(textarea)
      }),
      selectionBridge.onSelectionChange.subscribe((range) => {
        if (range) {
          if (!isFocus) {
            textarea?.focus()
          }
          isFocus = true
          textarea?.focus()
        } else {
          textarea?.blur()
          isFocus = false
          textarea?.blur()
        }
      })
    )

    selectionBridge.caret.elementRef.append(this.container)
  }

  destroy() {
    this.subscriptions.forEach(i => i.unsubscribe())
  }

  private handleDefaultActions(textarea) {
    this.subscriptions.push(
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
    this.subscriptions.push(
      fromEvent(textarea, 'compositionstart').subscribe(() => {
        isWriting = true
      }),
      fromEvent(textarea, 'compositionend').subscribe(() => {
        isWriting = false
      }),
      fromEvent<KeyboardEvent>(textarea, 'keydown').pipe(filter(() => {
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
    this.subscriptions.push(
      merge(
        fromEvent<InputEvent>(textarea, 'beforeinput').pipe(
          filter(ev => {
            ev.preventDefault()
            return !ev.isComposing && !!ev.data
          }),
          map(ev => {
            return ev.data as string
          })
        ),
        fromEvent<CompositionEvent>(textarea, 'compositionend').pipe(map(ev => {
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
