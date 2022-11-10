import { Subscription } from '@tanbo/stream'
import { Injectable } from '@tanbo/di'
import { createElement } from '@textbus/platform-browser'

@Injectable()
export class Layout {
  container: HTMLElement
  middle: HTMLElement
  workbench: HTMLElement
  scroller: HTMLElement

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

  private isAppendTop = false
  private isAppendBottom = false

  private sub: Subscription | null = null

  constructor(autoHeight = false) {
    this.container = createElement('div', {
      classes: ['textbus-container'],
      children: [
        this.middle = createElement('div', {
          classes: ['textbus-ui-middle'],
          children: [
            this.workbench = createElement('div', {
              classes: ['textbus-ui-workbench'],
              children: [
                this.scroller = createElement('div', {
                  classes: ['textbus-ui-scroller']
                })
              ]
            })
          ]
        })
      ]
    })

    if (autoHeight) {
      this.container.style.height = 'auto'
      this.scroller.style.overflow = 'visible'
      this.workbench.style.position = 'static'
    }
  }

  setTheme(theme: string) {
    this.container.classList.add('textbus-theme-' + theme)
  }

  destroy() {
    this.sub?.unsubscribe()
  }
}
