import { DestroyCallbacks, InsertAction, Operation, SharedArray, SharedConstant, SharedMap, SharedType } from './types'
import { Component } from './component'
import { MapModel } from './map-model'
import { ChangeMarker } from './change-marker'
import { Slot } from './slot'

export type ExtractDeltaType<T> =
  T extends SharedArray<infer Item> ?
    ArrayModel<Item> : T extends SharedMap<any> ?
      MapModel<T>
      : T extends SharedConstant ? T : never

export class ArrayModel<U extends SharedType<any>, T = ExtractDeltaType<U>> {
  destroyCallbacks: DestroyCallbacks = []
  readonly changeMarker = new ChangeMarker()

  get length() {
    return this._data.length
  }

  get data(): T[] {
    return [...this._data]
  }

  get first() {
    return this._data[0] || null
  }

  get last() {
    return this._data[this._data.length - 1] || null
  }

  private _data: T[] = []

  private index = 0

  constructor(private from: Component) {
    this.destroyCallbacks.push(() => {
      this._data.forEach(i => {
        if (i instanceof MapModel || i instanceof ArrayModel) {
          i.destroy()
        }
      })
    })
  }

  destroy() {
    this.destroyCallbacks.forEach(i => i())
    this.destroyCallbacks = []
  }

  insert(item: U) {
    let model: Slot | MapModel<any> | ArrayModel<any> | null = null
    let data: any = item
    if (item instanceof ArrayModel || item instanceof MapModel || item instanceof Slot) {
      data = item.toJSON()
      const oldIndex = this._data.indexOf(item as any)
      if (oldIndex >= 0) {
        let index = this.index
        if (oldIndex < index) {
          index--
        }
        this.retain(oldIndex)
        this.delete(1)
        this.retain(index)
      }
      model = item
    } else if (Array.isArray(item)) {
      const delta = new ArrayModel(this.from)
      item.forEach((child) => {
        delta.insert(child)
      })
      item = delta as any
      model = delta as ArrayModel<any>
    } else if (typeof item === 'object' && item !== null) {
      const delta = new MapModel(this.from)
      Object.entries(item).forEach(([key, value]) => {
        delta.set(key, value)
      })
      item = delta as any
      model = delta
    }
    const isSlot = item as any instanceof Slot
    if (isSlot) {
      (item as Slot).parent = this.from
    }
    if (model) {
      const sub = model!.changeMarker.onChange.subscribe(ops => {
        ops.paths.unshift(this.indexOf(model as T))
        if (model!.changeMarker.dirty) {
          this.changeMarker.markAsDirtied(ops)
        } else {
          this.changeMarker.markAsChanged(ops)
        }
      })
      sub.add(model.changeMarker.onTriggerPath.subscribe(paths => {
        paths.unshift(this.indexOf(model as T))
        this.changeMarker.triggerPath(paths)
      }))
      model.destroyCallbacks.push(() => {
        sub.unsubscribe()
      })
    }
    this._data.splice(this.index, 0, item as any)
    const op: Operation = {
      paths: [],
      apply: [
        {
          type: 'retain',
          offset: this.index,
        },
        {
          type: 'insert',
          data,
          isSlot,
          ref: item
        },
      ],
      unApply: [
        {
          type: 'retain',
          offset: this.index,
        },
        {
          type: 'delete',
          count: 1,
        },
      ],
    }
    this.index++
    this.changeMarker.markAsDirtied(op)
  }

  retain(index: number) {
    if (index < 0) {
      index = 0
    }
    if (index > this._data.length) {
      this.index = this._data.length
    }
    this.index = index
  }

  delete(count: number) {
    const deletedItems = this._data.splice(this.index, count)
    const op: Operation = {
      paths: [],
      apply: [
        {
          type: 'retain',
          offset: this.index,
        },
        {
          type: 'delete',
          count,
        },
      ],
      unApply: [
        {
          type: 'retain',
          offset: this.index,
        },
        ...deletedItems.map<InsertAction>((item) => {
          let data = item
          const isSlot = item instanceof Slot
          if (isSlot || item instanceof ArrayModel || item instanceof MapModel) {
            data = item.toJSON()
            item.destroy()
          }

          return {
            type: 'insert',
            data,
            ref: item,
            isSlot
          }
        }),
      ],
    }
    this.changeMarker.markAsDirtied(op)
  }

  indexOf(child: T): number {
    return this._data.indexOf(child)
  }

  toJSON(): any[] {
    return this._data.map((item) => {
      if (item instanceof ArrayModel || item instanceof MapModel) {
        return item.toJSON()
      }
      return item
    })
  }

  get(index: number) {
    return this._data[index]
  }

  pop() {
    this.retain(this.length - 1)
    this.delete(1)
  }

  remove(item: T) {
    const index = this._data.indexOf(item)
    if (index > -1) {
      this.retain(index)
      this.delete(1)
    }
  }

  insertByIndex(index: number, newItem: U) {
    this.retain(index)
    this.insert(newItem)
  }

  insertBefore(newItem: U, ref: T) {
    const index = this._data.indexOf(ref)
    if (index > -1) {
      this.insertByIndex(index, newItem)
    }
  }

  insertAfter(newItem: U, ref: T) {
    const index = this._data.indexOf(ref)
    if (index > -1) {
      this.insertByIndex(index + 1, newItem)
    }
  }

  find(fn: (item: T, index: number) => unknown) {
    for (let i = 0; i < this._data.length; i++) {
      const item = this._data[i]
      const b = fn(item, i)
      if (b) {
        return item
      }
    }
  }

  findIndex(fn: (item: T, index: number) => unknown) {
    for (let i = 0; i < this._data.length; i++) {
      const item = this._data[i]
      const b = fn(item, i)
      if (b) {
        return i
      }
    }
    return -1
  }

  some(fn: (item: T, index: number) => unknown) {
    for (let i = 0; i < this._data.length; i++) {
      const item = this._data[i]
      const b = fn(item, i)
      if (b) {
        return true
      }
    }
    return false
  }

  every(fn: (item: T, index: number) => unknown) {
    for (let i = 0; i < this._data.length; i++) {
      const item = this._data[i]
      const b = fn(item, i)
      if (!b) {
        return false
      }
    }
    return true
  }

  map<K>(fn: (item: T, index: number) => K): K[] {
    return this._data.map(fn)
  }

  forEach(fn: (item: T, index: number) => void) {
    this._data.forEach(fn)
  }

  slice(start?: number, end?: number) {
    return this._data.slice(start, end)
  }
}
