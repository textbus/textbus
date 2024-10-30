import { History, Module, Textbus, Selection } from '@textbus/core'
import { Subscription } from '@tanbo/stream'
import { Provider } from '@viewfly/core'
import { Doc as YDoc } from 'yjs'

import { Collaborate, SyncConnector, CollabHistory, NonSubModelLoader, SubModelLoader, MessageBus } from './base/_api'

export interface CollaborateConfig {
  createConnector(yDoc: YDoc): SyncConnector
}

export class CollaborateModule implements Module {
  private subscription = new Subscription()
  providers: Provider[] = [
    Collaborate,
    CollabHistory,
    {
      provide: History,
      useExisting: CollabHistory
    }, {
      provide: SyncConnector,
      useFactory: (collab: Collaborate) => {
        return this.config.createConnector(collab.yDoc)
      },
      deps: [Collaborate]
    }, {
      provide: SubModelLoader,
      useClass: NonSubModelLoader
    }
  ]

  constructor(public config: CollaborateConfig) {
  }

  setup(textbus: Textbus): Promise<(() => void) | void> | (() => void) | void {
    const messageBus = textbus.get(MessageBus, null)
    const connector = textbus.get(SyncConnector)
    if (messageBus) {
      const selection = textbus.get(Selection)
      connector.setLocalStateField('message', messageBus.get(textbus))
      this.subscription.add(
        messageBus.onSync.subscribe(() => {
          connector.setLocalStateField('message', messageBus.get(textbus))
        }),
        selection.onChange.subscribe(() => {
          connector.setLocalStateField('message', messageBus.get(textbus))
        }),
        connector.onStateChange.subscribe((states) => {
          messageBus.consume(states, textbus)
        })
      )
    }
    return connector.onLoad.toPromise()
  }

  onDestroy(textbus: Textbus) {
    this.subscription.unsubscribe()
    textbus.get(Collaborate).destroy()
    textbus.get(History).destroy()
    textbus.get(SyncConnector).onDestroy()
  }
}
