import { Injectable } from '@tanbo/di'
import { createElement, createTextNode } from '@textbus/browser'

import { Layout } from './layout'

@Injectable()
export class Message {
  private messageBox: HTMLElement

  constructor(private layout: Layout) {
    this.messageBox = createElement('div', {
      classes: ['textbus-message']
    })
    this.layout.workbench.append(this.messageBox)
  }

  message(message: string, time?: number) {
    this.createMessage('message', message, time)
  }

  info(message: string, time?: number) {
    this.createMessage('info', message, time)
  }

  success(message: string, time?: number) {
    this.createMessage('success', message, time)
  }

  warning(message: string, time?: number) {
    this.createMessage('warning', message, time)
  }

  danger(message: string, time?: number) {
    this.createMessage('danger', message, time)
  }

  private createMessage(type: string, message: string, time = 3000) {
    const tip = createElement('div', {
      classes: ['textbus-message-item', 'textbus-message-item-' + type],
      children: [createTextNode(message)]
    })
    this.messageBox.append(tip)
    setTimeout(() => {
      tip.remove()
    }, time)
  }
}
