import { AbstractType, Doc as YDoc, UndoManager } from 'yjs'
import { Inject, Injectable } from '@viewfly/core'
import { Observable, Subject } from '@tanbo/stream'
import { History, HISTORY_STACK_SIZE } from '@textbus/core'

@Injectable()
export class MultipleDocCollabHistory implements History {
  onChange: Observable<void>
  onBack: Observable<void>
  onForward: Observable<void>
  onPush: Observable<void>

  get canBack() {
    return this.actionStack.length > 0 && this.index > 0
  }

  get canForward() {
    return this.actionStack.length > 0 && this.index < this.actionStack.length
  }

  isListen = false

  private changeEvent = new Subject<void>()
  private backEvent = new Subject<void>()
  private forwardEvent = new Subject<void>()
  private pushEvent = new Subject<void>()
  private actionStack: UndoManager[][] = []

  private index = 0

  private stackItem: UndoManager[] | null = null
  private timer: any = null


  private docCaches = new Map<YDoc, AbstractType<any>>()

  private listenerCaches = new Map<YDoc, UndoManager>()

  constructor(@Inject(HISTORY_STACK_SIZE) private stackSize: number) {
    this.onChange = this.changeEvent.asObservable()
    this.onBack = this.backEvent.asObservable()
    this.onForward = this.forwardEvent.asObservable()
    this.onPush = this.pushEvent.asObservable()
  }

  listen() {
    this.isListen = true

    this.docCaches.forEach((yType, yDoc) => {
      this.listenItem(yType, yDoc)
    })
  }

  add(yType: AbstractType<any>, origin: YDoc) {
    if (this.docCaches.has(origin)) {
      return
    }
    this.docCaches.set(origin, yType)
    if (this.isListen) {
      this.listenItem(yType, origin)
    }
  }

  forward() {
    if (!this.canForward) {
      return
    }
    clearTimeout(this.timer as any)
    const item = this.actionStack[this.index]
    if (item) {
      for (const i of item) {
        i.redo()
      }
    }
    this.index++
    this.forwardEvent.next()
    this.changeEvent.next()
  }

  back() {
    if (!this.canBack) {
      return
    }
    clearTimeout(this.timer as any)
    let actions: UndoManager[]
    if (this.stackItem) {
      actions = this.stackItem
      this.stackItem = null
    } else {
      this.index--
      actions = this.actionStack[this.index]
    }
    let len = actions.length
    while (len > 0) {
      len--
      actions[len].undo()
    }
    if (actions) {
      this.backEvent.next()
      this.changeEvent.next()
    }
  }

  clear() {
    this.actionStack = []
    this.stackItem = []
    this.index = 0
    clearTimeout(this.timer as any)
    this.listenerCaches.forEach((undoManager) => {
      undoManager.clear()
    })
    this.changeEvent.next()
  }

  destroy() {
    this.clear()
    this.listenerCaches.forEach((undoManager, yDoc) => {
      undoManager.destroy()
      yDoc.destroy()
    })
    this.docCaches.clear()
    this.listenerCaches.clear()
  }

  private listenItem(yType: AbstractType<any>, origin: YDoc) {
    const undoManager = new UndoManager(yType, {
      trackedOrigins: new Set([origin]),
      captureTimeout: 0
    })

    undoManager.on('stack-item-added', (event: any) => {
      if (event.type === 'undo' && !(event.origin instanceof UndoManager)) {
        if (this.index != this.actionStack.length) {
          const redoStack = this.actionStack.slice(this.index)
          redoStack.forEach(item => {
            item.forEach(i => {
              i.clear(false, true)
            })
          })
          this.actionStack.length = this.index
          this.changeEvent.next()
        }
        if (this.stackItem === null) {
          this.stackItem = []
          this.timer = setTimeout(() => {
            if (this.actionStack.length >= this.stackSize) {
              this.actionStack.shift()
            } else {
              this.index++
            }
            this.actionStack.push(this.stackItem!)
            this.stackItem = null
            this.pushEvent.next()
            this.changeEvent.next()
          }, 500)
        }

        this.stackItem.push(undoManager)
      }
    })

    this.listenerCaches.set(origin, undoManager)
  }
}
