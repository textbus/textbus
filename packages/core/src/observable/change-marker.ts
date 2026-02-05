import { Observable, Subject } from '@tanbo/stream'

import { Action, DestroyCallbacks, Operation } from '../model/types'
import { Component } from '../model/component'
import { Slot } from '../model/slot'
import { Model, toRaw } from './observe'
import { isType } from './util'
import { getObserver } from './help'
import { invokeListener } from '../model/on-events'

export type Paths = Array<string | number>

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
    if (this._changeBefore) {
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
    } else if (Array.isArray(this.host)) {
      this.host.forEach(i => {
        const proxy = getObserver(i) as Model
        if (proxy) {
          proxy.__changeMarker__.detach()
        }
      })
    } else if (isType(this.host, 'Object')) {
      const state = this.host instanceof Component ? this.host.state : this.host
      const values = Object.values(state)
      for (const value of values) {
        if (value instanceof Slot) {
          value.__changeMarker__.detach()
        } else {
          const proxy = getObserver(toRaw(value as any)) as Model
          if (proxy) {
            proxy.__changeMarker__.detach()
          }
        }
      }
      if (this.host instanceof Component) {
        invokeListener(this.host, 'onDetach')
      }
    }
    this.detachCallbacks = []
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
