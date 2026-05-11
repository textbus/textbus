import { Observable, Subject } from '@tanbo/stream'

import { Action, DestroyCallbacks, Operation } from '../model/types'
import { Component } from '../model/component'
import { invokeListener } from '../model/on-events'
import { Slot } from '../model/slot'
import { Model, toRaw } from './observe'
import { isType } from './util'
import { getChangeMarker } from './help'

export type Paths = Array<string | number>

/**
 * 与 host（Component / Slot）相关、由宿主在构造函数里挂在 {@link ChangeMarker.hostHooks} 上的协作逻辑。
 */
export type ChangeMarkerPathResolution =
  | { resolved: true; segment: string | number }
  | { resolved: false }

export interface ChangeMarkerHostHooks {
  resolvePathSegment(childHost: object): ChangeMarkerPathResolution

  detachHostedMarkers?(): void
}

function pathSegmentInComponent(parent: Component<any>, childHost: object): string | number | null {
  const viaHooks = parent.changeMarker.hostHooks?.resolvePathSegment(childHost)
  if (viaHooks?.resolved) {
    return viaHooks.segment
  }
  if (childHost === toRaw(parent.state)) {
    return 'state'
  }
  return null
}

function pathSegmentInSlot(parent: Slot<any>, childHost: object): string | number | null {
  const viaHooks = parent.changeMarker.hostHooks?.resolvePathSegment(childHost)
  if (viaHooks?.resolved) {
    return viaHooks.segment
  }
  if (childHost === toRaw(parent.state)) {
    return 'state'
  }
  return parent.indexOf(childHost as Component)
}

let onewayUpdate = false

/**
 * 用来标识数据模型的数据变化
 */
export class ChangeMarker {
  onForceChange: Observable<void>
  onChange: Observable<Operation>
  onChangeBefore: Observable<void>
  onSelfChange: Observable<Action[]>

  get irrevocableUpdate() {
    return this._irrevocableUpdate
  }

  get dirty() {
    return this._dirty
  }

  get changed() {
    return this._changed
  }

  parentModel: Model | null = null

  /**
   * 宿主模型可在此挂上与路径解析、detach 相关的扩展（默认未设置），与 {@link parentModel} 类似由外部赋值。
   */
  hostHooks?: ChangeMarkerHostHooks

  private detachCallbacks: DestroyCallbacks = []
  private _irrevocableUpdate = false
  private _dirty = true
  private _changed = true
  private _changeBefore = true
  private changeEvent = new Subject<Operation>()
  private selfChangeEvent = new Subject<Action[]>()
  private forceChangeEvent = new Subject<void>()
  private changeBeforeEvent = new Subject<void>()

  constructor(public host: object) {
    this.onChange = this.changeEvent.asObservable()
    this.onSelfChange = this.selfChangeEvent.asObservable()
    this.onForceChange = this.forceChangeEvent.asObservable()
    this.onChangeBefore = this.changeBeforeEvent.asObservable()
  }

  addDetachCallback(callback: () => void) {
    this.detachCallbacks.push(callback)
  }

  getPaths(): Paths {
    const path = this.getPathInParent()
    if (path !== null) {
      const parentPaths = this.parentModel!.__changeMarker__.getPaths()
      return [...parentPaths, path]
    }
    return []
  }

  beforeChange() {
    if (this._changeBefore && (this.host instanceof Slot || this.host instanceof Component)) {
      return
    }
    this._changeBefore = true
    this.changeBeforeEvent.next()
    if (this.parentModel) {
      this.parentModel.__changeMarker__.beforeChange()
    }
  }

  forceMarkDirtied(source?: Component<any>) {
    if (this._dirty) {
      return
    }
    this._dirty = true
    this.forceMarkChanged(source)
  }

  forceMarkChanged(source?: Component<any>) {
    if (this._changed) {
      return
    }
    this._changed = true
    this.forceChangeEvent.next()
    if (this.parentModel) {
      if (!source && this.host instanceof Component) {
        this.parentModel.__changeMarker__.forceMarkDirtied(source)
      } else {
        this.parentModel.__changeMarker__.forceMarkChanged(source)
      }
    }
  }

  markAsDirtied(operation: Operation) {
    this._dirty = true
    operation.irrevocable = onewayUpdate
    this._irrevocableUpdate = onewayUpdate
    if (operation.paths.length === 0) {
      this.selfChangeEvent.next([...operation.apply])
    }
    this.markAsChanged(operation)
    this._irrevocableUpdate = false
  }

  markAsChanged(operation: Operation) {
    this._changed = true
    this.changeEvent.next(operation)
    if (this.parentModel) {
      const path = this.getPathInParent()
      if (path !== null) {
        operation.paths.unshift(path)
        if (operation.source) {
          this.parentModel.__changeMarker__.markAsChanged(operation)
        } else if (this.host instanceof Component) {
          operation.source = this.host
          this.parentModel.__changeMarker__.markAsChanged(operation)
        } else {
          this.parentModel.__changeMarker__.markAsDirtied(operation)
        }
      }
    }
  }

  rendered() {
    if (this._dirty && this.host instanceof Slot) {
      this.host.sliceContent().forEach(i => {
        if (i instanceof Component) {
          invokeListener(i, 'onParentSlotUpdated')
        }
      })
    }
    this._dirty = this._changed = this._changeBefore = false
  }

  reset() {
    this._changed = this._dirty = this._changeBefore = true
  }

  detach() {
    this.detachCallbacks.forEach(i => i())
    if (this.host instanceof Slot) {
      this.host.sliceContent().forEach(i => {
        if (i instanceof Component) {
          i.changeMarker.detach()
        }
      })
      this.host.changeMarker.hostHooks?.detachHostedMarkers?.()
      this.host.state.__changeMarker__.detach()
      this.detachCallbacks = []
      return
    }
    if (this.host instanceof Component) {
      this.host.changeMarker.hostHooks?.detachHostedMarkers?.()
      this.host.state.__changeMarker__.detach()
      invokeListener(this.host, 'onDetach')
      this.detachCallbacks = []
      return
    }
    if (Array.isArray(this.host)) {
      this.host.forEach(i => {
        const proxy = getChangeMarker(i) as ChangeMarker
        if (proxy) {
          proxy.detach()
        }
      })
      this.detachCallbacks = []
      return
    }
    const values = Object.values(this.host)
    for (const value of values) {
      const proxy = getChangeMarker(value)
      if (proxy) {
        proxy.detach()
      }
    }
    this.detachCallbacks = []
  }

  private getPathInParent(): string | number | null {
    const parentModel = this.parentModel
    if (!parentModel) {
      return null
    }
    if (parentModel instanceof Component) {
      return pathSegmentInComponent(parentModel, this.host)
    }

    if (parentModel instanceof Slot) {
      return pathSegmentInSlot(parentModel, this.host)
    }
    if (Array.isArray(parentModel)) {
      return (parentModel.__changeMarker__.host as any[]).indexOf(this.host)
    }
    if (isType(parentModel, 'Object')) {
      const entries = Object.entries(parentModel.__changeMarker__.host)
      for (const [key, value] of entries) {
        if (toRaw(value as any) === this.host) {
          return key
        }
      }
    }
    return null
  }
}

/**
 * 在回调函数内改变组件状态时，将更改的状态标记为不可撤回的
 * @param fn
 */
export function irrevocableUpdate(fn: () => void) {
  onewayUpdate = true
  fn()
  onewayUpdate = false
}
