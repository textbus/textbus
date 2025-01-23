import { Doc as YDoc } from 'yjs'
import { WebsocketProvider } from 'y-websocket'

import { SyncConnector } from '../base/sync-connector'
import { Message } from '../base/message-bus'

export class YWebsocketConnector extends SyncConnector {
  provide: WebsocketProvider

  private onSync = (is: boolean) => {
    if (is) {
      this.loadEvent.next()
    }
  }

  private onUpdate = () => {
    const syncStates: Message<any>[] = []
    this.provide.awareness.getStates().forEach((state, id) => {
      syncStates.push({
        clientId: id,
        message: state.message,
      })
    })
    this.stateChangeEvent.next(syncStates)
  }

  constructor(url: string, roomName: string, yDoc: YDoc) {
    super()
    this.onLoad = this.loadEvent.asObservable()
    this.onStateChange = this.stateChangeEvent.asObservable()
    this.provide = new WebsocketProvider(url, roomName, yDoc)

    this.provide.once('sync', this.onSync)
    this.provide.awareness.on('update', this.onUpdate)
  }

  setLocalStateField(key: string, data: Record<string, any>) {
    this.provide.awareness.setLocalStateField(key, data)
  }

  onDestroy() {
    this.provide.awareness.off('update', this.onUpdate)
    this.provide.disconnect()
    this.provide.destroy()
  }
}
