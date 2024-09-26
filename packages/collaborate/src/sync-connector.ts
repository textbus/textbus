import { Doc as YDoc } from 'yjs'
import { Observable } from '@tanbo/stream'

/**
 * 协作通信通用接口
 */
export abstract class SyncConnector {
  abstract onLoad: Observable<void>
  abstract onStateChange: Observable<any>

  abstract setLocalStateField(key: string, data: Record<string, any>): void

  abstract onDestroy(): void
}
