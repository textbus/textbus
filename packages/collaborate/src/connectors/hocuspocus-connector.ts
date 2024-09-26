import { Observable, Subject } from '@tanbo/stream'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { HocuspocusProviderConfiguration } from '@hocuspocus/provider'

import { SyncConnector } from '../sync-connector'

export class HocuspocusConnector extends SyncConnector {
  onLoad: Observable<void>
  onStateChange: Observable<any>
  private loadEvent = new Subject<void>()
  private stateChangeEvent = new Subject<any>()

  private provide: HocuspocusProvider

  constructor(config: HocuspocusProviderConfiguration) {
    super()
    this.onLoad = this.loadEvent.asObservable()
    this.onStateChange = this.stateChangeEvent.asObservable()
    this.provide = new HocuspocusProvider({
      ...config,
      onSynced: (data) => {
        config.onSynced?.(data)
        this.loadEvent.next()
      },
      onAwarenessUpdate: (data) => {
        config.onAwarenessUpdate?.(data)
        data.states.forEach(state => {
          this.stateChangeEvent.next(state)
        })
      },
    })
  }

  setLocalStateField(key: string, data: Record<string, any>) {
    this.provide.setAwarenessField(key, data)
  }

  onDestroy() {
    this.provide.disconnect()
    this.provide.destroy()
  }
}
