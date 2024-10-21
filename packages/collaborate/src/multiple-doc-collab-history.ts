import { AbstractType, Item, UndoManager, Doc as YDoc } from 'yjs'
import { Inject, Injectable, Optional } from '@viewfly/core'
import { Observable, Subject, Subscription } from '@tanbo/stream'
import { History, HISTORY_STACK_SIZE, RootComponentRef } from '@textbus/core'

import { Collaborate } from './collaborate'
import { CustomUndoManagerConfig } from './collab-history'

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

  private subscription = new Subscription()

  private subDocs = new Set<AbstractType<any>>()

  private listenerCaches = new Set<UndoManager>()

  constructor(private collaborate: Collaborate,
              private rootComponentRef: RootComponentRef,
              @Inject(HISTORY_STACK_SIZE) private stackSize: number,
              @Optional() private undoManagerConfig: CustomUndoManagerConfig) {
    this.onChange = this.changeEvent.asObservable()
    this.onBack = this.backEvent.asObservable()
    this.onForward = this.forwardEvent.asObservable()
    this.onPush = this.pushEvent.asObservable()
  }

  listen() {
    this.isListen = true
    const root = this.collaborate.yDoc.getMap('RootComponent')
    const rootComponent = this.rootComponentRef.component!
    this.collaborate.syncRootComponent(this.collaborate.yDoc, root, rootComponent)

    this.listenItem(root, this.collaborate.yDoc)

    this.subscription.add(
      this.collaborate.onAddSubModel.subscribe(({yType, yDoc}) => {
        if (this.subDocs.has(yType)) {
          return
        }
        this.subDocs.add(yType)
        if (this.isListen) {
          this.listenItem(yType, yDoc)
        }
      })
    )
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
    this.subscription.unsubscribe()
    this.listenerCaches.forEach((undoManager) => {
      undoManager.destroy()
    })
    this.subDocs.clear()
    this.listenerCaches.clear()
  }

  private listenItem(yType: AbstractType<any>, yDoc: YDoc) {
    const undoManagerConfig = this.undoManagerConfig || {}
    const undoManager = new UndoManager(yType, {
      trackedOrigins: new Set([yDoc]),
      captureTimeout: 0,
      captureTransaction(arg) {
        if (undoManagerConfig.captureTransaction) {
          return undoManagerConfig.captureTransaction(arg)
        }
        return true
      },
      deleteFilter(item: Item) {
        if (undoManagerConfig.deleteFilter) {
          return undoManagerConfig.deleteFilter(item)
        }
        return true
      }
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

    this.listenerCaches.add(undoManager)
  }
}
