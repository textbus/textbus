import { HocuspocusProvider } from '@hocuspocus/provider'
import { HocuspocusProviderConfiguration } from '@hocuspocus/provider'

import { SyncConnector, SyncState } from '../sync-connector'

export class HocuspocusConnector extends SyncConnector {
  provide: HocuspocusProvider

  constructor(config: HocuspocusProviderConfiguration) {
    super()
    this.provide = new HocuspocusProvider({
      ...config,
      onSynced: (data) => {
        config.onSynced?.(data)
        this.loadEvent.next()
      },
      onAwarenessUpdate: (data) => {
        config.onAwarenessUpdate?.(data)
        const states: SyncState[] = data.states.map(state => {
          return {
            clientId: state.clientId,
            state: {
              ...state
            } as Record<string, any>
          }
        })
        this.stateChangeEvent.next(states)
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
