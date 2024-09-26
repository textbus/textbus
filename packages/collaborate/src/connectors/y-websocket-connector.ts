import { Doc as YDoc } from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { Observable, Subject } from '@tanbo/stream'

import { SyncConnector } from '../sync-connector'

export class YWebsocketConnector extends SyncConnector {
  onLoad: Observable<void>
  onStateChange: Observable<any>
  private provide: WebsocketProvider
  private loadEvent = new Subject<void>()
  private stateChangeEvent = new Subject<any>()

  constructor(url: string, roomName: string, yDoc: YDoc) {
    super()
    this.onLoad = this.loadEvent.asObservable()
    this.onStateChange = this.stateChangeEvent.asObservable()
    this.provide = new WebsocketProvider(url, roomName, yDoc)

    this.provide.on('sync', (is: boolean) => {
      if (is) {
        this.loadEvent.next()
      }
    })

    this.provide.awareness.on('update', () => {
      this.provide.awareness.getStates().forEach(state => {
        this.stateChangeEvent.next(state)
      })
    })
  }

  setLocalStateField(key: string, data: Record<string, any>) {
    this.provide.awareness.setLocalStateField(key, data)
  }

  onDestroy() {
    this.provide.disconnect()
  }
}
