import { Subscription } from '@tanbo/stream'
import { Injectable } from '@tanbo/di'
import { createElement, SelectionBridge } from '@textbus/browser'

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

  listenCaretChange(bridge: SelectionBridge) {
    this.sub = bridge.caret.onPositionChange.subscribe(position => {
      if (!position) {
        return
      }
      setTimeout(() => {
        const limit = this.scroller
        const scrollTop = limit.scrollTop
        const offsetHeight = limit.offsetHeight
        const paddingTop = parseInt(getComputedStyle(limit).paddingTop) || 0

        const cursorTop = position.top + position.height + paddingTop + 10
        const viewTop = scrollTop + offsetHeight
        if (cursorTop > viewTop) {
          limit.scrollTop = cursorTop - offsetHeight
        } else if (position.top < scrollTop) {
          limit.scrollTop = position.top
        }
      })
    })
  }

  destroy() {
    this.sub?.unsubscribe()
  }
}
