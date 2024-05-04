import { Observable, Subject } from '@tanbo/stream'

import { Action, DestroyCallbacks, Operation } from './types'
import { Component } from './component'
import { isType, ProxyModel, toRaw } from './proxy'
import { Slot } from './slot'

export type Paths = Array<string | number>

/**
 * 用来标识组件或插槽的数据变化
 */
export class ChangeMarker {
  destroyCallbacks: DestroyCallbacks = []
  onForceChange: Observable<void>
  onChange: Observable<Operation>
  onChildComponentRemoved: Observable<Component>
  onSelfChange: Observable<Action[]>

  get dirty() {
    return this._dirty
  }

  get changed() {
    return this._changed
  }

  parentModel: ProxyModel<any> | null = null

  private _dirty = true
  private _changed = true
  private changeEvent = new Subject<Operation>()
  private selfChangeEvent = new Subject<Action[]>()
  private childComponentRemovedEvent = new Subject<Component>()
  private forceChangeEvent = new Subject<void>()

  constructor(public host: object) {
    this.onChange = this.changeEvent.asObservable()
    this.onChildComponentRemoved = this.childComponentRemovedEvent.asObservable()
    this.onSelfChange = this.selfChangeEvent.asObservable()
    this.onForceChange = this.forceChangeEvent.asObservable()
  }

  triggerPath(): Paths {
    const path = this.getPathInParent()
    if (path !== null) {
      const parentPaths = this.parentModel!.__changeMarker__.triggerPath()
      return [...parentPaths, path]
    }
    return []
  }

  forceMarkDirtied() {
    if (this._dirty) {
      return
    }
    this._dirty = true
    this.forceMarkChanged()
  }

  forceMarkChanged() {
    if (this._changed) {
      return
    }
    this._changed = true
    this.forceChangeEvent.next()
    if (this.parentModel) {
      if (this._dirty) {
        this.parentModel.__changeMarker__.forceMarkDirtied()
      } else {
        this.parentModel.__changeMarker__.forceMarkChanged()
      }
    }
  }

  markAsDirtied(operation: Operation) {
    this._dirty = true
    if (operation.paths.length === 0) {
      this.selfChangeEvent.next([...operation.apply])
    }
    this.markAsChanged(operation)
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

  destroy() {
    this.destroyCallbacks.forEach(i => i())
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
