import { Inject, Injectable, Optional } from '@viewfly/core'
import { AbstractSelection, History, HISTORY_STACK_SIZE, RootComponentRef, Scheduler, Selection } from '@textbus/core'
import { Observable, Subject, Subscription } from '@tanbo/stream'
import {
  createAbsolutePositionFromRelativePosition,
  createRelativePositionFromTypeIndex,
  Item,
  RelativePosition,
  Text as YText,
  Transaction,
  UndoManager
} from 'yjs'

import { Collaborate } from './collaborate'

export abstract class CustomUndoManagerConfig {
  abstract captureTransaction?(arg0: Transaction): boolean

  abstract deleteFilter?(arg0: Item): boolean
}

interface CursorPosition {
  anchor: RelativePosition
  focus: RelativePosition
}

interface CollaborateHistorySelectionPosition {
  before: CursorPosition | null
  after: CursorPosition | null
}

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
              private selection: Selection,
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
    this.collaborate.syncComponent(root, rootComponent)

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
        beforePosition = this.getRelativeCursorLocation()
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
            after: this.getRelativeCursorLocation()
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
      if (p) {
        const selection = this.getAbstractSelection(p)
        if (selection) {
          this.selection.setBaseAndExtent(
            selection.anchorSlot,
            selection.anchorOffset,
            selection.focusSlot,
            selection.focusOffset)
          return
        }
      }
      this.selection.unSelect()
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
    this.collaborate.destroy()
    this.manager?.destroy()
  }

  private getAbstractSelection(position: CursorPosition): AbstractSelection | null {
    const anchorPosition = createAbsolutePositionFromRelativePosition(position.anchor, this.collaborate.yDoc)
    const focusPosition = createAbsolutePositionFromRelativePosition(position.focus, this.collaborate.yDoc)
    if (anchorPosition && focusPosition) {
      const focusSlot = this.collaborate.slotMap.get(focusPosition.type as YText)
      const anchorSlot = this.collaborate.slotMap.get(anchorPosition.type as YText)
      if (focusSlot && anchorSlot) {
        return {
          anchorSlot,
          anchorOffset: anchorPosition.index,
          focusSlot,
          focusOffset: focusPosition.index
        }
      }
    }
    return null
  }

  private getRelativeCursorLocation(): CursorPosition | null {
    const { anchorSlot, anchorOffset, focusSlot, focusOffset } = this.selection
    if (anchorSlot) {
      const anchorYText = this.collaborate.slotMap.get(anchorSlot)
      if (anchorYText) {
        const anchorPosition = createRelativePositionFromTypeIndex(anchorYText, anchorOffset!)
        if (focusSlot) {
          const focusYText = this.collaborate.slotMap.get(focusSlot)
          if (focusYText) {
            const focusPosition = createRelativePositionFromTypeIndex(focusYText, focusOffset!)
            return {
              focus: focusPosition,
              anchor: anchorPosition
            }
          }
        }
      }
    }
    return null
  }
}
