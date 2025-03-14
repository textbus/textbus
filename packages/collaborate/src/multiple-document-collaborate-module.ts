import { History, Module, Selection, Textbus } from '@textbus/core'
import { Provider } from '@viewfly/core'
import { Subscription } from '@tanbo/stream'

import { Collaborate, SyncConnector, MultipleDocCollabHistory, SubModelLoader, MessageBus } from './base/_api'
import { CollaborateConfig } from './collaborate-module'

export interface MultipleDocCollaborateConfig extends CollaborateConfig {
  subModelLoader: SubModelLoader
}

export class MultipleDocumentCollaborateModule implements Module {
  private subscription = new Subscription()
  providers: Provider[] = [
    Collaborate,
    MultipleDocCollabHistory,
    {
      provide: History,
      useExisting: MultipleDocCollabHistory
    }, {
      provide: SyncConnector,
      useFactory: (collab: Collaborate) => {
        return this.config.createConnector(collab.yDoc)
      },
      deps: [Collaborate]
    }, {
      provide: SubModelLoader,
      useFactory: () => {
        return this.config.subModelLoader
      }
    }
  ]

  private timer: any = null

  constructor(public config: MultipleDocCollaborateConfig) {
  }

  setup(textbus: Textbus): Promise<(() => void) | void> | (() => void) | void {
    const messageBus = textbus.get(MessageBus, null)
    const connector = textbus.get(SyncConnector)
    const collab = textbus.get(Collaborate)
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
    return connector.onLoad.toPromise().then(() => {
      if (!this.config.onlyLoad) {
        return
      }
      const root = collab.yDoc.getMap('RootComponent')
      if (root.has('state')) {
        return
      }
      return new Promise(resolve => {
        const testing = () => {
          if (root.has('state')) {
            resolve()
          } else {
            this.timer = setTimeout(testing, 1000)
          }
        }
        this.timer = setTimeout(testing, 1000)
      })
    })
  }

  onDestroy(textbus: Textbus) {
    this.subscription.unsubscribe()
    textbus.get(Collaborate).destroy()
    textbus.get(History).destroy()
    textbus.get(SyncConnector).onDestroy()
    clearTimeout(this.timer)
  }
}
