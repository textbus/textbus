import { Inject, Injectable, Optional } from '@viewfly/core'
import { History, HISTORY_STACK_SIZE, makeError, RootComponentRef, Scheduler } from '@textbus/core'
import { Observable, Subject, Subscription } from '@tanbo/stream'
import {
  Item,
  Transaction,
  UndoManager
} from 'yjs'

import { Collaborate, CollaborateHistorySelectionPosition, CursorPosition } from './collaborate'

export abstract class CustomUndoManagerConfig {
  abstract captureTransaction?(arg0: Transaction): boolean

  abstract deleteFilter?(arg0: Item): boolean
}

const collabHistoryErrorFn = makeError('CollabHistory')

@Injectable()
export class CollabHistory implements History {
  onBack: Observable<void>
  onForward: Observable<void>
  onChange: Observable<void>
  onPush: Observable<void>

  get canBack() {
    return this.manager?.canUndo() || false
  }

  get canForward() {
    return this.manager?.canRedo() || false
  }

  private manager: UndoManager | null = null

  private historyItems: Array<CollaborateHistorySelectionPosition> = []
  private index = 0
  private subscriptions: Subscription[] = []

  private backEvent = new Subject<void>()
  private forwardEvent = new Subject<void>()
  private changeEvent = new Subject<void>()
  private pushEvent = new Subject<void>()

  constructor(private rootComponentRef: RootComponentRef,
              private collaborate: Collaborate,
              private scheduler: Scheduler,
              @Inject(HISTORY_STACK_SIZE) private stackSize: number,
              @Optional() private undoManagerConfig: CustomUndoManagerConfig) {
    this.onBack = this.backEvent.asObservable()
    this.onForward = this.forwardEvent.asObservable()
    this.onChange = this.changeEvent.asObservable()
    this.onPush = this.pushEvent.asObservable()

  }

  listen() {
    const root = this.collaborate.yDoc.getMap('RootComponent')
    const rootComponent = this.rootComponentRef.component!
    this.collaborate.syncRootComponent(this.collaborate.yDoc, root, rootComponent)

    const undoManagerConfig = this.undoManagerConfig || {}
    const manager = new UndoManager(root, {
      trackedOrigins: new Set<any>([this.collaborate.yDoc]),
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
    this.manager = manager

    let beforePosition: CursorPosition | null = null
    this.subscriptions.push(
      this.scheduler.onLocalChangeBefore.subscribe(() => {
        beforePosition = this.collaborate.getRelativeCursorLocation()
      }),
      this.collaborate.onAddSubModel.subscribe(() => {
        throw collabHistoryErrorFn('single document does not support submodels.')
      })
    )

    manager.on('stack-item-added', (event: any) => {
      if (event.type === 'undo') {
        if (event.origin === manager) {
          this.index++
        } else {
          this.historyItems.length = this.index
          this.historyItems.push({
            before: beforePosition,
            after: this.collaborate.getRelativeCursorLocation()
          })
          this.index++
        }
      } else {
        this.index--
      }
      if (manager.undoStack.length > this.stackSize) {
        this.historyItems.shift()
        manager.undoStack.shift()
      }
      if (event.origin === this.collaborate.yDoc) {
        this.pushEvent.next()
      }
      this.changeEvent.next()
    })
    manager.on('stack-item-popped', (ev: any) => {
      const index = ev.type === 'undo' ? this.index : this.index - 1
      const position = this.historyItems[index] || null
      const p = ev.type === 'undo' ? position?.before : position?.after
      this.collaborate.restoreCursorPosition(p)
    })
  }


  back() {
    if (this.canBack) {
      this.manager?.undo()
      this.backEvent.next()
    }
  }

  forward() {
    if (this.canForward) {
      this.manager?.redo()
      this.forwardEvent.next()
    }
  }

  clear() {
    const last = this.historyItems.pop()
    this.historyItems = last ? [last] : []
    this.index = last ? 1 : 0
    this.manager?.clear()
    this.changeEvent.next()
  }

  destroy() {
    this.index = 0
    this.historyItems = []
    this.subscriptions.forEach(i => i.unsubscribe())
    if (this.manager) {
      this.manager.destroy()
      this.manager.captureTransaction = () => true
      this.manager.deleteFilter = () => true
      this.manager.trackedOrigins = new Set([null])
    }

    this.manager = null
  }
}
