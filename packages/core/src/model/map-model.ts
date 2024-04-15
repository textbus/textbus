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
    const isSlot = value as any instanceof Slot
    if (isSlot) {
      (value as Slot).parent = this.from
      model = value as Slot
    }
    if (model) {
      const sub = model.changeMarker.onChange.subscribe(ops => {
        ops.paths.unshift(key)
        if (model!.changeMarker.dirty) {
          this.changeMarker.markAsDirtied(ops)
        } else {
          this.changeMarker.markAsChanged(ops)
        }
      })
      sub.add(model.changeMarker.onTriggerPath.subscribe(paths => {
        paths.unshift(key)
        this.changeMarker.triggerPath(paths)
      }))
      model.destroyCallbacks.push(() => {
        sub.unsubscribe()
      })
    }

    this.data.set(key, value)
    this.changeMarker.markAsDirtied({
      paths: [],
      apply: [
        {
          type: 'propSet',
          key,
          value: model ? model.toJSON() : value,
          isSlot,
          ref: value
        },
      ],
      unApply: [
        has
          ? {
            type: 'propSet',
            key,
            value: oldValue,
            isSlot,
            ref: model
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
      const isSlot = oldValue instanceof Slot
      let value: any = oldValue
      if (isSlot || oldValue instanceof MapModel || oldValue instanceof ArrayModel) {
        value = oldValue.toJSON()
        oldValue.destroy()
      }

      this.changeMarker.markAsDirtied({
        paths: [],
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
            value,
            ref: oldValue,
            isSlot
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
