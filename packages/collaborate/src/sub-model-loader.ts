import { Component, ContentType, Slot, State } from '@textbus/core'
import { Doc as YDoc } from 'yjs'

/**
 * 异步加载组件
 *
 * metadata 用于记录子文档静态数据
 */
export abstract class AsyncComponent<Metadata = any,
  T extends State = State> extends Component<T> {

  abstract getMetadata(): Metadata

  abstract setMetadata(metadata: T): void
}

/**
 * 异步加载插槽
 *
 * metadata 用于记录子文档静态数据
 */
export class AsyncSlot extends Slot {
  constructor(schema: ContentType[], public metadata: any) {
    super(schema)
  }
}

/**
 * 子文档加载器
 */
export abstract class SubModelLoader {
  /**
   * 当本地新增异步子插槽时调用
   * @param slot
   */
  abstract createSubModelBySlot(slot: AsyncSlot): Promise<YDoc>

  /**
   * 当本地新增异步子组件时调用
   * @param component
   */
  abstract createSubModelByComponent(component: AsyncComponent): Promise<YDoc>

  /**
   * 当远程异步子插槽同步到本地时调用
   * @param slot
   */
  abstract loadSubModelBySlot(slot: AsyncSlot): Promise<YDoc>

  /**
   * 当远程异步子组件同步到本地时调用
   * @param component
   */
  abstract loadSubModelByComponent(component: AsyncComponent): Promise<YDoc>
}
