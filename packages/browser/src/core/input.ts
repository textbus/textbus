import { filter, fromEvent, map, merge, Subscription } from '@tanbo/stream'
import { Injectable } from '@tanbo/di'
import { Commander, ContentType, Keyboard, Slot, TBSelection } from '@textbus/core'

import { createElement } from '../_utils/uikit'
import { SelectionBridge } from './selection-bridge'
import { Parser } from '../dom-support/parser'

export const isWindows = /win(dows|32|64)/i.test(navigator.userAgent)
export const isMac = /mac os/i.test(navigator.userAgent)

@Injectable()
export class Input {
  private container = createElement('span', {
    styles: {
      width: '100%',
      height: '100%',
      position: 'absolute',
      overflow: 'hidden'
    }
  })

  private textarea = document.createElement('textarea')

  private subscriptions: Subscription[] = []

  constructor(private parser: Parser,
              private keyboard: Keyboard,
              private commander: Commander,
              private selection: TBSelection,
              private selectionBridge: SelectionBridge) {
    const textarea = this.textarea

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

    this.container.appendChild(textarea)
    selectionBridge.caret.elementRef.append(this.container)
    this.subscriptions.push(
      selectionBridge.onSelectionChange.subscribe((range) => {
        if (range) {
          this.textarea.focus()
        } else {
          this.textarea.blur()
        }
      }),
      fromEvent(textarea, 'blur').subscribe(() => {
        selectionBridge.caret.hide()
      })
    )

    this.handleInput()
    this.handleShortcut()
    this.handleDefaultActions()
  }

  destroy() {
    this.subscriptions.forEach(i => i.unsubscribe())
  }

  private handleDefaultActions() {
    this.subscriptions.push(
      fromEvent<ClipboardEvent>(this.textarea, 'paste').subscribe(ev => {
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
        div.style.cssText = 'width:10px; height:10px; overflow: hidden; position: fixed; left: -9999px'
        div.contentEditable = 'true'
        document.body.appendChild(div)
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

  private handleShortcut() {
    let isWriting = false
    this.subscriptions.push(
      fromEvent(this.textarea, 'compositionstart').subscribe(() => {
        isWriting = true
      }),
      fromEvent(this.textarea, 'compositionend').subscribe(() => {
        isWriting = false
      }),
      fromEvent<KeyboardEvent>(this.textarea, 'keydown').pipe(filter(() => {
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

  private handleInput() {
    const textarea = this.textarea
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
          this.commander.insert(text)
        }
      })
    )
  }
}
