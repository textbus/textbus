import { Injectable } from '@tanbo/di'
import { createElement } from '@textbus/browser'

@Injectable()
export class Layout {
  container: HTMLElement
  middle: HTMLElement
  workbench: HTMLElement

  get top() {
    if (!this.isAppendTop) {
      this.container.prepend(this._top)
      this.isAppendTop = true
    }
    return this._top
  }

  get bottom() {
    if (!this.isAppendBottom) {
      this.container.append(this._bottom)
      this.isAppendBottom = true
    }
    return this._bottom
  }

  private _top: HTMLElement = createElement('div', {
    classes: ['textbus-ui-top']
  })
  private _bottom: HTMLElement = createElement('div', {
    classes: ['textbus-ui-bottom']
  })

  private isAppendTop = false;
  private isAppendBottom = false;

  constructor() {
    this.container = createElement('div', {
      classes: ['textbus-container'],
      children: [
        this.middle = createElement('div', {
          classes: ['textbus-ui-middle'],
          children: [
            this.workbench = createElement('div', {
              classes: ['textbus-ui-workbench']
            })
          ]
        })
      ]
    })
  }

  setTheme(theme: string) {
    this.container.classList.add('textbus-theme-' + theme)
  }
}
