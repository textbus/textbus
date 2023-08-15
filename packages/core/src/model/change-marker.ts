import { Observable, Subject } from '@tanbo/stream'

import { ComponentInstance } from './component'
import { Operation } from './types'

/**
 * 用来标识组件或插槽的数据变化
 */
export class ChangeMarker {
  onChange: Observable<Operation>
  onChildComponentRemoved: Observable<ComponentInstance>

  get dirty() {
    return this._dirty
  }

  get changed() {
    return this._changed
  }

  private _dirty = true
  private _changed = true
  private changeEvent = new Subject<Operation>()
  private childComponentRemovedEvent = new Subject<ComponentInstance>()

  constructor() {
    this.onChange = this.changeEvent.asObservable()
    this.onChildComponentRemoved = this.childComponentRemovedEvent.asObservable()
  }

  markAsDirtied(operation: Operation) {
    this._dirty = true
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

  recordComponentRemoved(instance: ComponentInstance) {
    this.childComponentRemovedEvent.next(instance)
  }
}
