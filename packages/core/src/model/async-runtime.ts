import { Observable, Subject } from '@tanbo/stream'

import { State } from './types'
import { Component, ComponentLiteral } from './component'
import { ContentType, Slot, SlotJSON } from './slot'
import { FormatLiteral } from './format'
import { observe, ProxyModel, toRaw } from '../observable/observe'
import { detachModel } from '../observable/help'
import {
  ChangeMarker,
  type ChangeMarkerPathResolution,
} from '../observable/change-marker'
import type {
  AsyncComponentLiteral,
  AsyncSlotLiteral,
  Metadata,
} from './async-literals'

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
export abstract class AsyncComponent<M extends Metadata = Metadata,
  T extends State = State> extends Component<T> {
  metadata: M

  constructor(state: T, metadata: M) {
    super(state)
    this.metadata = observe(metadata)
    const changeMarker = (this.metadata as ProxyModel<M>).__changeMarker__
    changeMarker.parentModel = this

    const sub = changeMarker.onChange.subscribe(() => {
      this.changeMarker.forceMarkDirtied()
    })

    this.changeMarker.addDetachCallback(() => {
      sub.unsubscribe()
      detachModel(this.state)
    })

    this.changeMarker.hostHooks = {
      resolvePathSegment: (childHost: object): ChangeMarkerPathResolution => {
        if (childHost === toRaw(this.metadata)) {
          return { resolved: true, segment: 'metadata' }
        }
        return { resolved: false }
      },
      detachHostedMarkers: () => {
        this.metadata.__changeMarker__.detach()
      },
    }
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
    metadataChangeMarker.parentModel = this

    const sub = metadataChangeMarker.onChange.subscribe(() => {
      this.changeMarker.forceMarkDirtied()
    })

    this.changeMarker.addDetachCallback(() => {
      sub.unsubscribe()
      detachModel(this.metadata)
    })

    this.changeMarker.hostHooks = {
      resolvePathSegment: (childHost: object): ChangeMarkerPathResolution => {
        if (childHost === toRaw(this.metadata)) {
          return { resolved: true, segment: 'metadata' }
        }
        return { resolved: false }
      },
      detachHostedMarkers: () => {
        this.metadata.__changeMarker__.detach()
      },
    }
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
