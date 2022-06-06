import { Plugin, Renderer, Scheduler } from '@textbus/core'
import { Injector } from '@tanbo/di'
import { Caret, CaretPosition } from '@textbus/browser'
import { Subscription } from '@tanbo/stream'

export class FixedCaretPlugin implements Plugin {
  private subscriptions = new Subscription()

  constructor(public scrollContainer: HTMLElement) {
  }

  setup(injector: Injector) {
    const scheduler = injector.get(Scheduler)
    const caret = injector.get(Caret)
    const renderer = injector.get(Renderer)

    let isChanged = false
    let caretPosition: CaretPosition | null = null
    renderer.onViewChecked.subscribe(() => {
      isChanged = true
    })
    this.subscriptions.add(caret.onPositionChange.subscribe(position => {
      if (isChanged && caretPosition && position && !scheduler.hasLocalUpdate) {
        const offset = position.top - caretPosition.top
        this.scrollContainer.scrollTop += offset
        isChanged = false
      }
      caretPosition = position
    }))
  }

  onDestroy() {
    this.subscriptions.unsubscribe()
  }
}
