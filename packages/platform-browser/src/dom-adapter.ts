import { Injectable } from '@viewfly/core'
import { ComponentInstance, Slot, ViewAdapter, NodeLocation } from '@textbus/core'
import { Observable, Subject } from '@tanbo/stream'

/**
 * Textbus PC 端浏览器渲染能力实现
 */
@Injectable()
export abstract class DomAdapter extends ViewAdapter {
  onViewUpdated: Observable<void>
  viewUpdatedEvent = new Subject<void>()

  constructor() {
    super()
    this.onViewUpdated = this.viewUpdatedEvent.asObservable()
  }

  copy() {
    document.execCommand('copy')
  }

  abstract getNativeNodeByComponent(component: ComponentInstance): HTMLElement

  abstract getNativeNodeBySlot(slot: Slot): HTMLElement

  /**
   * 获取插槽内容节点集合
   * @param slot
   */
  abstract getNodesBySlot(slot: Slot): Node[]

  /**
   * 获取原生节点的原始数据在文档中的位置
   * @param node
   */
  abstract getLocationByNativeNode(node: Node): NodeLocation | null
}
