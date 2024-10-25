import { Observable, Subject } from '@tanbo/stream'

import { State } from './types'
import { AsyncComponentLiteral, Component, ComponentLiteral } from './component'
import { AsyncSlotLiteral, ContentType, Slot, SlotJSON } from './slot'
import { FormatLiteral } from './format'

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

  override toJSON(): AsyncComponentLiteral<State> {
    return {
      ...super.toJSON(),
      async: true,
      metadata: this.getMetadata()
    }
  }
}

export class AsyncSlotJSON extends SlotJSON implements AsyncSlotLiteral {
  async = true as const

  constructor(schema: ContentType[],
              content: Array<string | ComponentLiteral>,
              attributes: Record<string, any>,
              formats: FormatLiteral,
              public metadata: any) {
    super(schema, content, attributes, formats)
  }
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

  override toJSON(): AsyncSlotJSON {
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
