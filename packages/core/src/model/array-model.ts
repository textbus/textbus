import { DestroyCallbacks, ExtractDeltaType, InsertAction, Operation, SharedType } from './types'
import { Component } from './component'
import { MapModel } from './map-model'
import { ChangeMarker } from './change-marker'
import { Slot } from './slot'

export class ArrayModel<U extends SharedType<any>, T = ExtractDeltaType<U>> {
  destroyCallbacks: DestroyCallbacks = []
  readonly changeMarker = new ChangeMarker()

  get length() {
    return this._data.length
  }

  get data(): T[] {
    return [...this._data]
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
}

