import { Observable, Subject } from '@tanbo/stream'

import { State } from './types'
import { AsyncComponentLiteral, Component, ComponentConstructor, ComponentLiteral, ComponentStateLiteral } from './component'
import { ContentType, Slot, SlotJSON, SlotLiteral } from './slot'
import { FormatLiteral } from './format'
import { Textbus } from '../textbus'
import { observe } from '../observable/observe'
import { detachModel } from '../observable/help'
import { ChangeMarker } from '../observable/change-marker'

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

  constructor(state: T, metadata: M) {
    super(state)
    this.metadata = observe(metadata)
    this.changeMarker.addDetachCallback(() => {
      detachModel(this.metadata)
    })
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

export interface AsyncSlotLiteral<
  T extends Record<string, any> = Record<string, any>,
  U = any> extends SlotLiteral<T> {
  async: true
  metadata: U
}

export class AsyncSlotJSON<
  T extends Record<string, any>,
  U extends Record<string, any> = Record<string, any>> extends SlotJSON<T> implements AsyncSlotLiteral<T, U> {
  async = true as const

  constructor(schema: ContentType[],
              content: Array<string | ComponentLiteral>,
              attributes: Record<string, any>,
              formats: FormatLiteral,
              state: T,
              public metadata: U) {
    super(schema, content, attributes, formats, state)
  }
}

/**
 * 异步加载插槽
 *
 * metadata 用于记录子文档静态数据
 */
export class AsyncSlot<
  U extends Record<string, any> = Record<string, any>,
  M extends Metadata = Metadata,
> extends Slot<U> {
  loader = new AsyncModelLoader()
  readonly metadata: M

  constructor(schema: ContentType[], state: U = {} as U, metadata: M) {
    super(schema, state)
    this.metadata = observe(metadata)

    const metadataChangeMarker = this.metadata.__changeMarker__ as ChangeMarker

    const sub = metadataChangeMarker.onChange.subscribe(() => {
      this.changeMarker.forceMarkDirtied()
    })

    this.changeMarker.addDetachCallback(() => {
      sub.unsubscribe()
      detachModel(this.metadata)
    })
  }

  override toJSON(): AsyncSlotJSON<U, M> {
    const attrs: Record<string, any> = {}
    this.attributes.forEach((value, key) => {
      attrs[key.name] = value
    })
    return new AsyncSlotJSON(
      [...this.schema],
      this.content.toJSON(),
      attrs,
      this.format.toJSON(),
      this.state,
      this.metadata,
    )
  }
}
