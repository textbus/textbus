import { Observable, Subject } from '@tanbo/stream'

import { Action, DestroyCallbacks, Operation } from './types'
import { Component } from './component'

export type Paths = Array<string | number>

/**
 * 用来标识组件或插槽的数据变化
 */
export class ChangeMarker {
  destroyCallbacks: DestroyCallbacks = []
  onTriggerPath: Observable<Paths>
  onChange: Observable<Operation>
  onChildComponentRemoved: Observable<Component>
  onSelfChange: Observable<Action[]>

  get dirty() {
    return this._dirty
  }

  get changed() {
    return this._changed
  }

  private _dirty = true
  private _changed = true
  private changeEvent = new Subject<Operation>()
  private triggerPathEvent = new Subject<Paths>()
  private selfChangeEvent = new Subject<Action[]>()
  private childComponentRemovedEvent = new Subject<Component>()

  constructor() {
    this.onChange = this.changeEvent.asObservable()
    this.onTriggerPath = this.triggerPathEvent.asObservable()
    this.onChildComponentRemoved = this.childComponentRemovedEvent.asObservable()
    this.onSelfChange = this.selfChangeEvent.asObservable()
  }

  triggerPath(paths: Paths) {
    this.triggerPathEvent.next(paths)
    return paths
  }

  markAsDirtied(operation: Operation) {
    this._dirty = true
    this.selfChangeEvent.next([...operation.apply])
    this.markAsChanged(operation)
  }

  markAsChanged(operation: Operation) {
    this._changed = true
    this.changeEvent.next(operation)
  }

  rendered() {
    this._dirty = this._changed = false
  }

  reset() {
    this._changed = this._dirty = true
  }

  recordComponentRemoved(instance: Component) {
    this.childComponentRemovedEvent.next(instance)
  }

  destroy() {
    this.destroyCallbacks.forEach(i => i())
    this.destroyCallbacks = []
  }
}
