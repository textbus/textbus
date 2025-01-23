import { Observable, Subject } from '@tanbo/stream'

import { Action, DestroyCallbacks, Operation } from './types'
import { Component, invokeListener } from './component'
import { getProxyObject, isType, ProxyModel, toRaw } from './proxy'
import { Slot } from './slot'

export type Paths = Array<string | number>

let onewayUpdate = false

/**
 * @internal
 * 修复内存泄漏，外部不可用
 */
export const __markerCache = new Set<ChangeMarker>()

/**
 * 用来标识组件或插槽的数据变化
 */
export class ChangeMarker {
  destroyCallbacks: DestroyCallbacks = []
  onForceChange: Observable<void>
  onChange: Observable<Operation>
  onChildComponentRemoved: Observable<Component>
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

  parentModel: ProxyModel<any> | null = null

  private _irrevocableUpdate = false
  private _dirty = true
  private _changed = true
  private changeEvent = new Subject<Operation>()
  private selfChangeEvent = new Subject<Action[]>()
  private childComponentRemovedEvent = new Subject<Component>()
  private forceChangeEvent = new Subject<void>()

  constructor(public host: object) {
    __markerCache.add(this)
    this.onChange = this.changeEvent.asObservable()
    this.onChildComponentRemoved = this.childComponentRemovedEvent.asObservable()
    this.onSelfChange = this.selfChangeEvent.asObservable()
    this.onForceChange = this.forceChangeEvent.asObservable()
  }

  getPaths(): Paths {
    const path = this.getPathInParent()
    if (path !== null) {
      const parentPaths = this.parentModel!.__changeMarker__.getPaths()
      return [...parentPaths, path]
    }
    return []
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
      if (!source) {
        source = this.host instanceof Component ? this.host : source
      }
      if (source) {
        this.parentModel.__changeMarker__.forceMarkChanged(source)
      } else {
        this.parentModel.__changeMarker__.forceMarkDirtied(source)
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
    this._dirty = this._changed = false
  }

  reset() {
    this._changed = this._dirty = true
  }

  recordComponentRemoved(instance: Component) {
    this.childComponentRemovedEvent.next(instance)
    if (this.parentModel) {
      this.parentModel.__changeMarker__.recordComponentRemoved(instance)
    }
  }

  destroy(sync = false) {
    __markerCache.delete(this)
    this.destroyCallbacks.forEach(i => i())
    if (this.host instanceof Slot) {
      this.host.sliceContent().forEach(i => {
        if (i instanceof Component) {
          if (sync) {
            i.changeMarker.destroy(sync)
          } else {
            this.recordComponentRemoved(i)
          }
        }
      })
    } else if (Array.isArray(this.host)) {
      this.host.forEach(i => {
        const proxy = getProxyObject(i)
        if (proxy) {
          proxy.__changeMarker__.destroy(sync)
        }
      })
    } else if (isType(this.host, 'Object')) {
      const state = this.host instanceof Component ? this.host.state : this.host
      const values = Object.values(state)
      for (const value of values) {
        if (value instanceof Slot) {
          value.__changeMarker__.destroy(sync)
        } else {
          const proxy = getProxyObject(toRaw(value as any))
          if (proxy) {
            proxy.__changeMarker__.destroy(sync)
          }
        }
      }
      if (this.host instanceof Component) {
        invokeListener(this.host, 'onDestroy')
      }
    }
    this.destroyCallbacks = []
  }

  private getPathInParent(): string | number | null {
    const parentModel = this.parentModel
    if (!parentModel) {
      return null
    }
    if (parentModel instanceof Slot) {
      return parentModel.indexOf(this.host as Component<any>)
    }
    if (Array.isArray(parentModel)) {
      return (parentModel.__changeMarker__.host as any[]).indexOf(this.host)
    }
    if (isType(parentModel, 'Object')) {
      const host = parentModel.__changeMarker__.host
      const raw = host instanceof Component ? host.state : host
      const entries = Object.entries(raw)
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
