import { Component, ContentType, makeError, Slot, State } from '@textbus/core'
import { Doc, Doc as YDoc } from 'yjs'
import { Observable, Subject } from '@tanbo/stream'
import { Injectable } from '@viewfly/core'

const subModelLoaderErrorFn = makeError('subModelLoaderError')

export class AsyncModelLoader {
  onRequest: Observable<void>

  private requestEvent = new Subject<void>()

  constructor() {
    this.onRequest = this.requestEvent.asObservable()
  }

  request() {
    this.requestEvent.next()
    this.requestEvent.complete()
  }
}

/**
 * 异步加载组件
 *
 * metadata 用于记录子文档静态数据
 */
export abstract class AsyncComponent<Metadata = any,
  T extends State = State> extends Component<T> {

  loader = new AsyncModelLoader()

  abstract getMetadata(): Metadata

  abstract setMetadata(metadata: T): void
}

/**
 * 异步加载插槽
 *
 * metadata 用于记录子文档静态数据
 */
export class AsyncSlot extends Slot {
  loader = new AsyncModelLoader()

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

@Injectable()
export class NonSubModelLoader extends SubModelLoader {
  createSubModelBySlot(): Promise<Doc> {
    throw subModelLoaderErrorFn('single document does not support async slot.')
  }

  createSubModelByComponent(): Promise<Doc> {
    throw subModelLoaderErrorFn('single document does not support async component.')
  }

  loadSubModelByComponent(): Promise<Doc> {
    throw subModelLoaderErrorFn('single document does not support async component.')
  }

  loadSubModelBySlot(): Promise<Doc> {
    throw subModelLoaderErrorFn('single document does not support async slot.')
  }
}
