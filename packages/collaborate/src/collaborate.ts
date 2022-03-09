import { Injectable } from '@tanbo/di'
import { debounceTime, filter, Observable, Subject, Subscription, tap } from '@tanbo/stream'
import {
  RootComponentRef,
  Starter,
  Operation,
  Translator,
  Registry,
  Selection,
  SelectionPaths,
  History, Renderer
} from '@textbus/core'
import { Doc as YDoc, UndoManager } from 'yjs'
import { localToRemote } from './collab/local-to-remote'
import { remoteToLocal } from './collab/remote-to-local'
import { CollaborateCursor, RemoteSelection } from './collab/_api'

@Injectable()
export class Collaborate implements History {
  onSelectionChange: Observable<SelectionPaths>
  yDoc = new YDoc()
  onBack: Observable<void>
  onForward: Observable<void>
  onChange: Observable<any>
  onPush: Observable<void>

  get canBack() {
    return this.manager?.canUndo()
  }

  get canForward() {
    return this.manager?.canRedo()
  }

  private backEvent = new Subject<void>()
  private forwardEvent = new Subject<void>()
  private changeEvent = new Subject<void>()
  private pushEvent = new Subject<void>()

  private manager!: UndoManager

  private subscriptions: Subscription[] = []
  private updateFromSelf = true

  private selectionChangeEvent = new Subject<SelectionPaths>()

  constructor(private rootComponentRef: RootComponentRef,
              private collaborateCursor: CollaborateCursor,
              private translator: Translator,
              private renderer: Renderer,
              private registry: Registry,
              private selection: Selection,
              private starter: Starter) {
    this.onSelectionChange = this.selectionChangeEvent.asObservable()
    this.onBack = this.backEvent.asObservable()
    this.onForward = this.forwardEvent.asObservable()
    this.onChange = this.changeEvent.asObservable()
    this.onPush = this.pushEvent.asObservable()
  }

  setup() {
    this.subscriptions.push(
      this.starter.onReady.subscribe(() => {
        this.listen2()
      }),
      this.selection.onChange.subscribe(() => {
        const paths = this.selection.getPaths()
        this.selectionChangeEvent.next(paths)
      })
    )
  }

  updateRemoteSelection(paths: RemoteSelection[]) {
    this.collaborateCursor.draw(paths)
  }

  listen() {
    //
  }

  back() {
    if (this.canBack) {
      this.manager.undo()
    }
  }

  forward() {
    if (this.canForward) {
      this.manager.redo()
    }
  }

  destroy() {
    this.subscriptions.forEach(i => i.unsubscribe())
  }

  private listen2() {
    const root = this.yDoc.getArray('content')
    const slot = this.rootComponentRef.component.slots.get(0)!
    this.manager = new UndoManager(root)
    root.observeDeep((events, transaction) => {
      if (transaction.origin === this.yDoc) {
        return
      }
      this.updateFromSelf = false

      remoteToLocal(events, slot, this.translator, this.registry)
      this.renderer.render()
      this.selection.restore()
      this.updateFromSelf = true
    })
    const operations: Operation[] = []
    this.subscriptions.push(
      this.rootComponentRef.component.changeMarker.onChange.pipe(
        filter(() => {
          return this.updateFromSelf
        }),
        tap(op => {
          operations.push(op)
        }),
        debounceTime(1)
      ).subscribe(() => {
        this.yDoc.transact(() => {
          operations.forEach(operation => {
            localToRemote(operation, root)
          })
          operations.length = 0
        }, this.yDoc)
        this.renderer.render()
        this.selection.restore()
      })
    )
  }
}
