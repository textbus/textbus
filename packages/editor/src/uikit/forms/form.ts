import { Observable, Subject } from '@tanbo/stream'
import { createElement, createTextNode } from '@textbus/browser'

import { FormItem } from './help'
import { FileUploader } from '../file-uploader'
import { ViewController } from '../types'

export interface FormConfig {
  title?: string;
  editProperty?: 'attrs' | 'styles',
  items: Array<FormItem>;
  mini?: boolean;
  maxHeight?: string;
  confirmBtnText?: string;
  cancelBtnText?: string;
}

export class Form implements ViewController<Record<string, any>>{
  onComplete: Observable<Record<string, any>>;
  onCancel: Observable<void>;

  body: HTMLElement;
  footer: HTMLElement;
  readonly elementRef: HTMLFormElement;
  private completeEvent = new Subject<Map<string, any>>();
  private cancelEvent = new Subject<void>();

  constructor(private config: FormConfig) {
    this.onComplete = this.completeEvent.asObservable()
    this.onCancel = this.cancelEvent.asObservable()
    this.elementRef = createElement('form', {
      classes: [config.mini ? 'textbus-form-mini' : 'textbus-form'],
      attrs: {
        novalidate: true,
        autocomplete: 'off'
      }
    }) as HTMLFormElement
    if (config.title) {
      this.elementRef.appendChild(createElement('h3', {
        classes: ['textbus-form-title'],
        children: [createTextNode(config.title)]
      }))
    }
    this.elementRef.appendChild(this.body = createElement('div', {
      attrs: {
        novalidate: 'novalidate'
      },
      classes: config.mini ? [] : ['textbus-form-body'],
      children: config.items.map(item => {
        return item.elementRef
      })
    }))

    if (this.config.maxHeight) {
      this.body.style.maxHeight = this.config.maxHeight
    }

    const btns = config.mini ? [
      createElement('button', {
        attrs: {
          type: 'submit'
        },
        classes: ['textbus-btn', 'textbus-btn-block', 'textbus-btn-primary'],
        children: [createTextNode(this.config.confirmBtnText || '确定')]
      })
    ] : [
      createElement('button', {
        attrs: {
          type: 'submit'
        },
        classes: ['textbus-btn', 'textbus-btn-primary'],
        children: [createTextNode(this.config.confirmBtnText || '确定')]
      }),
      (() => {
        const cancelBtn = createElement('button', {
          classes: ['textbus-btn', 'textbus-btn-default'],
          attrs: {
            type: 'button'
          },
          children: [createTextNode(this.config.cancelBtnText || '取消')]
        })
        cancelBtn.addEventListener('click', () => {
          this.cancelEvent.next()
        })
        return cancelBtn
      })()
    ]
    this.elementRef.appendChild(this.footer = createElement('div', {
      classes: ['textbus-form-footer'],
      children: btns
    }))

    this.elementRef.addEventListener('submit', (ev: Event) => {
      ev.preventDefault()

      const map = new Map<string, any>()
      for (const item of config.items) {
        if (!item.validate()) {
          return
        }
        const i = item.getAttr()
        if (i) {
          map.set(i.name, i.value)
        }
      }
      this.completeEvent.next(map)
    })
  }

  addItem(item: FormItem, index?: number) {
    if (typeof index === 'number') {
      const next = this.config.items[index]
      if (next) {
        this.config.items.splice(index, 0, item)
        this.elementRef.insertBefore(item.elementRef, next.elementRef)
        return
      }
    }
    this.config.items.push(item)
    this.body.appendChild(item.elementRef)
  }

  removeItem(item: FormItem) {
    const index = this.config.items.indexOf(item)
    if (index > -1) {
      this.config.items.splice(index, 1)
      item.elementRef.parentNode?.removeChild(item.elementRef)
    }
  }

  reset(): void {
    this.config.items.forEach(item => {
      item.reset()
    })
  }

  setFileUploader(fileUploader: FileUploader): void {
    this.config.items.forEach(item => {
      if (typeof item.useUploader === 'function') {
        item.useUploader(fileUploader)
      }
    })
  }

  update(value: Record<string, any>): void {
    Object.keys(value).forEach(key => {
      this.config.items.forEach(item => {
        if (item.name === key) {
          item.update(value[key])
        }
      })
    })
  }
}
