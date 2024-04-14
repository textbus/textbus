import { Observable, Subject } from '@tanbo/stream'

import { InsertAction, Operation } from './types'
import { Slot } from './slot'
import { Component } from './component'
import { MapModel } from './map-model'

export type SharedConstant = boolean | string | number

export type SharedArray<T extends SharedConstant | SharedMap<T> | SharedArray<T>> = Array<T>

export type SharedMap<T extends SharedConstant | SharedArray<T> | SharedMap<T>> = Record<string, T>

export type SharedType<T extends SharedArray<T> | SharedMap<T>> = SharedConstant | SharedArray<T> | SharedMap<T>

export type ExtractDeltaType<T> =
  T extends SharedType<infer K>
    ? K extends SharedArray<infer Item>
      ? ArrayModel<Item>
      : K extends SharedMap<any>
        ? MapModel<K>
        : never
    : never

export type TransferValueType<T> =
  T extends Slot ? T :
    T extends Array<infer Item> ?
      (Item extends SharedType<any> ?
        ArrayModel<Item> : never) :
      T extends Record<string, any> ? MapModel<T> : T

export type DestroyCallbacks = Array<() => void>

export class ArrayModel<U extends SharedType<any>, T = ExtractDeltaType<U>> {
  destroyCallbacks: DestroyCallbacks = []
  onChange: Observable<Operation>
  onRemove: Observable<T>

  get length() {
    return this._data.length
  }

  get data(): T[] {
    return [...this._data]
  }

  private _data: T[] = []

  private changeEvent = new Subject<Operation>()
  private removeEvent = new Subject<T>()
  private index = 0

  constructor(private from: Component) {
    this.onChange = this.changeEvent.asObservable()
    this.onRemove = this.removeEvent.asObservable()
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
    let data: any = item
    if (item instanceof ArrayModel || item instanceof MapModel) {
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
    } else if (Array.isArray(item)) {
      const delta = new ArrayModel(this.from)
      item.forEach((child) => {
        delta.insert(child)
      })
      item = delta as any
    } else if (typeof item === 'object' && item !== null) {
      const delta = new MapModel(this.from)
      Object.entries(item).forEach(([key, value]) => {
        delta.set(key, value)
      })
      item = delta as any
    }
    this._data.splice(this.index, 0, item as any)
    const op: Operation = {
      path: [],
      apply: [
        {
          type: 'retain',
          offset: this.index,
        },
        {
          type: 'insert',
          data
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
    this.changeEvent.next(op)
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
      path: [],
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
          const data = item instanceof ArrayModel || item instanceof MapModel ? item.toJSON() : item
          return {
            type: 'insert',
            data,
          }
        }),
      ],
    }
    deletedItems.forEach(i => {
      this.removeEvent.next(i)
    })
    this.changeEvent.next(op)
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

