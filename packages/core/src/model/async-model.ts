import { Observable, Subject } from '@tanbo/stream'

import { State } from './types'
import { AsyncComponentLiteral, Component, ComponentConstructor, ComponentLiteral, ComponentStateLiteral } from './component'
import { AsyncSlotLiteral, ContentType, Slot, SlotJSON } from './slot'
import { FormatLiteral } from './format'
import { Textbus } from '../textbus'
import { observe } from '../observable/observe'

export class AsyncModelLoader {
  onRequestLoad: Observable<void>
  onLoaded: Observable<void>

  get isLoaded() {
    return this._loaded
  }

  private _loaded = false

  private requestLoadEvent = new Subject<void>()
  private loadedEvent = new Subject<void>()

  constructor() {
    this.onRequestLoad = this.requestLoadEvent.asObservable()
    this.onLoaded = this.loadedEvent.asObservable()
  }

  load() {
    this.requestLoadEvent.next()
    this.requestLoadEvent.complete()
  }

  markAsLoaded() {
    this._loaded = true
    this.loadedEvent.next()
    this.loadedEvent.complete()
  }
}

export interface Metadata {
  [key: string]: any
}

/**
 * 异步加载组件
 *
 * metadata 用于记录子文档静态数据
 */
export abstract class AsyncComponent<M extends Metadata = Metadata,
  T extends State = State> extends Component<T> {
  metadata: M

  constructor(textbus: Textbus, state: T, metadata: M) {
    super(textbus, state)
    this.metadata = observe(metadata)
  }

  loader = new AsyncModelLoader()

  override toJSON(): AsyncComponentLiteral<State> {
    return {
      ...super.toJSON(),
      async: true,
      metadata: this.metadata
    }
  }
}

export interface AsyncComponentConstructor<
  M extends Metadata = Metadata,
  T extends State = State> extends ComponentConstructor<T> {
  /**
   * 通过 JSON 创建组件实例
   * @param textbus
   * @param data 组件状态字面量
   * @param metadata 异步组件元数据
   */
  fromJSONAndMetadata?(textbus: Textbus, data: ComponentStateLiteral<T>, metadata: M): AsyncComponent<M, T>
}

export class AsyncSlotJSON<T> extends SlotJSON implements AsyncSlotLiteral<T> {
  async = true as const

  constructor(schema: ContentType[],
              content: Array<string | ComponentLiteral>,
              attributes: Record<string, any>,
              formats: FormatLiteral,
              public metadata: T) {
    super(schema, content, attributes, formats)
  }
}

/**
 * 异步加载插槽
 *
 * metadata 用于记录子文档静态数据
 */
export class AsyncSlot<M extends Metadata = Metadata> extends Slot {
  loader = new AsyncModelLoader()
  metadata: M

  constructor(schema: ContentType[], metadata: M) {
    super(schema)
    this.metadata = observe(metadata)
  }

  override toJSON(): AsyncSlotJSON<M> {
    const attrs: Record<string, any> = {}
    this.attributes.forEach((value, key) => {
      attrs[key.name] = value
    })
    return new AsyncSlotJSON(
      [...this.schema],
      this.content.toJSON(),
      attrs,
      this.format.toJSON(),
      this.metadata
    )
  }
}
