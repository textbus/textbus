import { DestroyCallbacks, State, TransferValueType } from './types'
import { Component } from './component'
import { Slot } from './slot'
import { ArrayModel } from './array-model'
import { ChangeMarker } from './change-marker'

export class MapModel<T extends State> {
  destroyCallbacks: DestroyCallbacks = []
  readonly changeMarker = new ChangeMarker()
  readonly data = new Map<string, any>()

  constructor(private from: Component) {
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

    let model: Slot | MapModel<any> | ArrayModel<any> | null = null
    if (!(value as any instanceof MapModel) &&
      !(value as any instanceof ArrayModel) &&
      !(value as any instanceof Slot)) {
      if (Array.isArray(value)) {
        const delta = new ArrayModel(this.from)
        value.forEach((item: any) => {
          delta.insert(item)
        })
        value = delta as any
        model = delta as ArrayModel<any>
      } else if (typeof value === 'object' && value !== null) {
        const delta = new MapModel(this.from)
        Object.entries(value).forEach(([key, value]) => {
          delta.set(key, value)
        })
        value = delta as any
        model = delta
      }
    }
    if (value as any instanceof Slot) {
      this.from.slots.push(value)
      model = value
    }
    if (model) {
      model.destroyCallbacks.push(() => {
        model!.changeMarker.onChange.subscribe(ops => {
          ops.path.unshift(key)
          if (model!.changeMarker.dirty) {
            this.changeMarker.markAsDirtied(ops)
          } else {
            this.changeMarker.markAsChanged(ops)
          }
        })
      })
    }

    this.data.set(key, value)
    this.changeMarker.markAsDirtied({
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
      if (oldValue instanceof Slot || oldValue instanceof MapModel || oldValue instanceof ArrayModel) {
        oldValue.destroy()
      }
      this.changeMarker.markAsDirtied({
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
