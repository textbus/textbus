import { Injectable } from '@tanbo/di'
import { debounceTime, filter, Subscription, tap } from '@tanbo/stream'
import {
  RootComponentRef,
  Starter,
  Operation,
  Translator,
  FormatterList
} from '@textbus/core'
import { Doc as YDoc } from 'yjs'
import { localToRemote } from './local-to-remote'
import { remoteToLocal } from './remote-to-local'

// const collaborateErrorFn = makeError('Collaborate')

@Injectable()
export class Collaborate {
  yDoc = new YDoc()

  private subscriptions: Subscription[] = []
  private updateFromSelf = true

  constructor(private rootComponentRef: RootComponentRef,
              private translator: Translator,
              private formatterList: FormatterList,
              private starter: Starter) {
  }

  setup() {
    this.subscriptions.push(
      this.starter.onReady.subscribe(() => {
        this.listen()
      })
    )
  }

  destroy() {
    this.subscriptions.forEach(i => i.unsubscribe())
  }

  private listen() {
    const root = this.yDoc.getArray('content')
    const slot = this.rootComponentRef.component.slots.get(0)!
    root.observeDeep((events, transaction) => {
      if (transaction.origin === this.yDoc) {
        return
      }
      this.updateFromSelf = false

      remoteToLocal(events, slot, this.translator, this.formatterList)

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
