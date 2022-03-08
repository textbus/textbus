import { Injectable } from '@tanbo/di'
import { debounceTime, filter, Observable, Subject, Subscription, tap } from '@tanbo/stream'
import {
  RootComponentRef,
  Starter,
  Operation,
  Translator,
  Registry,
  Selection,
  SelectionPaths
} from '@textbus/core'
import { Doc as YDoc } from 'yjs'
import { localToRemote } from './collab/local-to-remote'
import { remoteToLocal } from './collab/remote-to-local'
import { CollaborateHistory, CollaborateCursor, RemoteSelection } from './collab/_api'

@Injectable()
export class Collaborate {
  onSelectionChange: Observable<SelectionPaths>
  yDoc = new YDoc()

  private subscriptions: Subscription[] = []
  private updateFromSelf = true

  private selectionChangeEvent = new Subject<SelectionPaths>()

  constructor(private rootComponentRef: RootComponentRef,
              private collaborateCursor: CollaborateCursor,
              private translator: Translator,
              private registry: Registry,
              private selection: Selection,
              private collaborateHistory: CollaborateHistory,
              private starter: Starter) {
    this.onSelectionChange = this.selectionChangeEvent.asObservable()
  }

  setup() {
    this.subscriptions.push(
      this.starter.onReady.subscribe(() => {
        this.listen()
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

  destroy() {
    this.subscriptions.forEach(i => i.unsubscribe())
  }

  private listen() {
    const root = this.yDoc.getArray('content')
    const slot = this.rootComponentRef.component.slots.get(0)!
    this.collaborateHistory.init(root)
    root.observeDeep((events, transaction) => {
      if (transaction.origin === this.yDoc) {
        return
      }
      this.updateFromSelf = false

      remoteToLocal(events, slot, this.translator, this.registry)

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
      })
    )
  }
}
