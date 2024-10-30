import { Observable, Subject } from '@tanbo/stream'
import { Textbus } from '@textbus/core'

export interface Message<T> {
  clientId: number
  message: T
}

/**
 * 协作消息总线，用于同步各终端消息
 */
export abstract class MessageBus<T> {
  onSync: Observable<void>
  protected syncEvent = new Subject<void>()

  constructor() {
    this.onSync = this.syncEvent.asObservable()
  }

  /**
   * 立即同步消息
   */
  sync() {
    this.syncEvent.next()
  }

  /**
   * 当需要同步协作消息是，Textbus 会自动调用，并把返回数据同步到其它终端
   */
  abstract get(textbus: Textbus): T

  /**
   * 当远程消息更新时，Textbus 会自动调用
   * @param message
   * @param textbus
   */
  abstract consume(message: Message<T>[], textbus: Textbus): void
}
