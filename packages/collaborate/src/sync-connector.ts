import { Observable, Subject } from '@tanbo/stream'

export interface SyncState {
  clientId: number
  state: Record<string, any>
}

/**
 * 协作通信通用接口
 */
export abstract class SyncConnector {
  /**
   * 当文档加载完成时触发的观察者
   */
  onLoad: Observable<void>
  /**
   * 当文档 awareness 状态变更时触发的观察者
   */
  onStateChange: Observable<SyncState[]>

  protected loadEvent = new Subject<void>()
  protected stateChangeEvent = new Subject<SyncState[]>()

  protected constructor() {
    this.onLoad = this.loadEvent.asObservable()
    this.onStateChange = this.stateChangeEvent.asObservable()
  }

  /**
   * 设置 awareness 状态
   * @param key 状态的 key
   * @param data 状态值
   */
  abstract setLocalStateField(key: string, data: Record<string, any>): void

  /**
   * 当文档销毁时调用
   */
  abstract onDestroy(): void
}
