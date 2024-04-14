import { Observable, Subject } from '@tanbo/stream'

import { Operation, State } from './types'
import { Component } from './component'
import { Slot } from './slot'
import { ArrayModel, DestroyCallbacks, TransferValueType } from './array-model'

export class MapModel<T extends State> {
  destroyCallbacks: DestroyCallbacks = []
  onChange: Observable<Operation>
  onRemove: Observable<any>
  readonly data = new Map<string, any>()

  private changeEvent = new Subject<Operation>()
  private removeEvent = new Subject<void>()

  constructor(private from: Component) {
    this.onChange = this.changeEvent.asObservable()
    this.onRemove = this.removeEvent.asObservable()
    this.destroyCallbacks.push(() => {
      this.data.forEach(i => {
        if (i instanceof MapModel || i instanceof ArrayModel) {
          i.destroy()
        }
      })
    })
  }

  set<K extends Exclude<keyof T, number | symbol>>(key: K, value: T[K]) {
    const has = this.data.has(key)
    const oldValue = this.data.get(key)
    if (oldValue === value) {
      return
    }

    if (!(value as any instanceof MapModel) &&
      !(value as any instanceof ArrayModel) &&
      !(value as any instanceof Slot)) {
      if (Array.isArray(value)) {
        const delta = new ArrayModel(this.from)
        value.forEach((item: any) => {
          delta.insert(item)
        })
        value = delta as any
      } else if (typeof value === 'object' && value !== null) {
        const delta = new MapModel(this.from)
        Object.entries(value).forEach(([key, value]) => {
          delta.set(key, value)
        })
        value = delta as any
      }
    }

    if (value as any instanceof Slot) {
      this.from.slots.push(value)
    }

    this.data.set(key, value)
    this.removeEvent.next(oldValue)
    this.changeEvent.next({
      path: [],
      apply: [
        {
          type: 'propSet',
          key,
          value,
        },
      ],
      unApply: [
        has
          ? {
            type: 'propSet',
            key,
            value: oldValue,
          }
          : {
            type: 'propDelete',
            key,
          },
      ],
    })
  }

  has<K extends Exclude<keyof T, number | symbol>>(key: K): boolean {
    return this.data.has(key)
  }

  get<K extends Exclude<keyof T, number | symbol>>(key: K): TransferValueType<T[K]> {
    return this.data.get(key) ?? null
  }

  remove<K extends Exclude<keyof T, number | symbol>>(key: K) {
    if (this.data.has(key)) {
      const oldValue = this.data.get(key)
      this.data.delete(key)
      this.removeEvent.next(oldValue)
      this.changeEvent.next({
        path: [],
        apply: [
          {
            type: 'propDelete',
            key,
          },
        ],
        unApply: [
          {
            type: 'propSet',
            key,
            value: oldValue,
          },
        ],
      })
    }
  }

  destroy() {
    this.destroyCallbacks.forEach(i => i())
    this.destroyCallbacks = []
  }

  toJSON() {
    const results: Record<string, any> = {}
    this.data.forEach((value, key) => {
      results[key] = (value instanceof ArrayModel || value instanceof MapModel || value instanceof Slot) ? value.toJSON() : value
    })
    return results as T
  }
}
