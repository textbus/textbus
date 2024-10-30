import { AbstractType, Item, UndoManager, Doc as YDoc } from 'yjs'
import { Inject, Injectable, Optional } from '@viewfly/core'
import { Observable, Subject, Subscription } from '@tanbo/stream'
import { History, HISTORY_STACK_SIZE, RootComponentRef, Scheduler } from '@textbus/core'

import { Collaborate, CollaborateHistorySelectionPosition, CursorPosition } from './collaborate'
import { CustomUndoManagerConfig } from './collab-history'

interface HistoryStackItem extends CollaborateHistorySelectionPosition {
  undoManagers: UndoManager[]
}

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
  private actionStack: HistoryStackItem[] = []

  private index = 0

  private stackItem: HistoryStackItem | null = null
  private timer: any = null
  private beforePosition: CursorPosition | null = null

  private subscription = new Subscription()

  private subDocs = new Set<AbstractType<any>>()

  private listenerCaches = new Set<UndoManager>()

  constructor(private collaborate: Collaborate,
              private scheduler: Scheduler,
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
      this.collaborate.onAddSubModel.subscribe(({ yType, yDoc }) => {
        if (this.subDocs.has(yType)) {
          return
        }
        this.subDocs.add(yType)
        if (this.isListen) {
          this.listenItem(yType, yDoc)
        }
      }),
      this.scheduler.onLocalChangeBefore.subscribe(() => {
        this.beforePosition = this.collaborate.getRelativeCursorLocation()
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
      for (const i of item.undoManagers) {
        i.redo()
      }
      this.collaborate.restoreCursorPosition(item.after)
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
    let historyStackItem: HistoryStackItem
    if (this.stackItem) {
      historyStackItem = this.stackItem
      this.stackItem = null
    } else {
      this.index--
      historyStackItem = this.actionStack[this.index]
    }
    let len = historyStackItem.undoManagers.length
    while (len > 0) {
      len--
      historyStackItem.undoManagers[len].undo()
    }
    if (historyStackItem) {
      const beforePosition = historyStackItem.before
      this.collaborate.restoreCursorPosition(beforePosition)
      this.backEvent.next()
      this.changeEvent.next()
    }
  }

  clear() {
    this.actionStack = []
    this.stackItem = null
    this.index = 0
    this.beforePosition = null
    clearTimeout(this.timer as any)
    this.listenerCaches.forEach((undoManager) => {
      undoManager.clear()
    })
    this.changeEvent.next()
  }

  destroy() {
    this.clear()
    this.beforePosition = this.stackItem = null
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
            item.undoManagers.forEach(i => {
              i.clear(false, true)
            })
          })
          this.actionStack.length = this.index
          this.changeEvent.next()
        }
        if (this.stackItem === null) {
          this.stackItem = {
            before: this.beforePosition,
            after: null,
            undoManagers: []
          }
          this.timer = setTimeout(() => {
            if (this.actionStack.length >= this.stackSize) {
              this.actionStack.shift()
            } else {
              this.index++
            }
            // this.beforePosition = this.collaborate.getRelativeCursorLocation()
            this.stackItem!.after = this.beforePosition
            this.actionStack.push(this.stackItem!)
            this.stackItem = null
            this.pushEvent.next()
            this.changeEvent.next()
          }, 500)
        }

        this.stackItem.undoManagers.push(undoManager)
      }
    })

    this.listenerCaches.add(undoManager)
  }
}
