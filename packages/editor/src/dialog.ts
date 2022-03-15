import { Injectable } from '@tanbo/di'
import { createElement } from '@textbus/browser'
import { Subscription } from '@tanbo/stream'

import { EditorController } from './editor-controller'

@Injectable()
export class Dialog {
  private elementRef: HTMLElement
  private dialogWrapper: HTMLElement
  private timer: any = null

  private subs: Subscription[] = []

  constructor(private editorController: EditorController) {
    this.elementRef = createElement('div', {
      classes: ['textbus-dialog'],
      children: [
        this.dialogWrapper = createElement('div', {
          classes: ['textbus-dialog-wrapper']
        })
      ]
    })
    document.body.appendChild(this.elementRef)
    this.subs.push(this.editorController.onStateChange.subscribe(status => {
      if (status.readonly) {
        this.hide()
      }
    }))
  }

  show(element: HTMLElement) {
    this.dialogWrapper.innerHTML = ''
    this.dialogWrapper.appendChild(element)
    this.elementRef.classList.add('textbus-dialog-active')
    this.timer = setTimeout(() => {
      this.dialogWrapper.classList.add('textbus-dialog-wrapper-active')
    }, 200)
  }

  hide() {
    this.dialogWrapper.classList.remove('textbus-dialog-wrapper-active')
    this.timer = setTimeout(() => {
      this.elementRef.classList.remove('textbus-dialog-active')
      this.dialogWrapper.innerHTML = ''
    }, 200)
  }

  destroy() {
    clearTimeout(this.timer)
    this.subs.forEach(i => i.unsubscribe())
    this.elementRef.parentNode?.removeChild(this.elementRef)
  }
}
