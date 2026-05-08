import { Doc as YDoc } from 'yjs'

import { SyncConnector } from '../base/sync-connector'
import { Message } from '../base/message-bus'

export interface LocalConnectorOptions {
  /**
   * 与其它连接器一致，会出现在 `onStateChange` 的 `clientId` 中。
   * 多实例场景可传入不同值以模拟多客户端。
   */
  clientId?: number
}

/**
 * 不经网络的协作连接器，实现与 {@link SyncConnector} 相同的对外行为，
 * 便于在单元测试中配合 {@link CollaborateModule} 使用，无需 WebSocket / Provider。
 *
 * - `onLoad`：在微任务中触发一次，对应远端「已同步可编辑」的时机。
 * - `onStateChange`：在每次 {@link LocalConnector.setLocalStateField} 后发出当前客户端状态，
 *   载荷形状与 `YWebsocketConnector` 一致（`{ clientId, message }`，其中 `message` 为 awareness 上的 `message` 字段）。
 *
 * 第一个参数与 `createConnector(yDoc)` 对齐，便于直接传入 `Collaborate` 的文档；当前实现不读写该 `YDoc`。
 */
export class LocalConnector extends SyncConnector {
  readonly clientId: number

  private destroyed = false
  private fields: Record<string, any> = {}

  constructor(_yDoc?: YDoc, options?: LocalConnectorOptions) {
    super()
    this.clientId = options?.clientId ?? 0
    Promise.resolve().then(() => {
      if (!this.destroyed) {
        this.loadEvent.next()
      }
    })
  }

  setLocalStateField(key: string, data: Record<string, any>) {
    if (this.destroyed) {
      return
    }
    this.fields[key] = data
    this.emitAwarenessStates()
  }

  onDestroy() {
    this.destroyed = true
  }

  /**
   * 读取当前本地 awareness 字段快照，仅用于测试断言。
   */
  getLocalAwarenessSnapshot(): Readonly<Record<string, any>> {
    return { ...this.fields }
  }

  private emitAwarenessStates() {
    const states: Message<any>[] = []
    states.push({
      clientId: this.clientId,
      message: this.fields.message
    })
    this.stateChangeEvent.next(states)
  }
}
