import { Observable, Subject } from '@tanbo/stream'

import { InsertAction, Operation, State } from './types'
import { Slot } from './slot'
import { Component } from './component'

export type SharedConstant = boolean | string | number

export type SharedArray<T extends SharedConstant | SharedMap<T> | SharedArray<T>> = Array<T>

export type SharedMap<T extends SharedConstant | SharedArray<T> | SharedMap<T>> = Record<string, T>

export type SharedType<T extends SharedArray<T> | SharedMap<T>> = SharedConstant | SharedArray<T> | SharedMap<T>

export type ExtractDeltaType<T> =
  T extends SharedType<infer K>
    ? K extends SharedArray<infer Item>
      ? ArrayDelta<Item>
      : K extends SharedMap<any>
        ? MapDelta<K>
        : never
    : never

export type TransferValueType<T> =
  T extends Slot ? T :
    T extends Array<infer Item> ?
      (Item extends SharedType<any> ?
        ArrayDelta<Item> : never) :
      T extends Record<string, any> ? MapDelta<T> : T

export type DestroyCallbacks = Array<() => void>

export class ArrayDelta<U extends SharedType<any>, T = ExtractDeltaType<U>> {
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
        if (i instanceof MapDelta || i instanceof ArrayDelta) {
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
    if (item instanceof ArrayDelta || item instanceof MapDelta) {
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
      const delta = new ArrayDelta(this.from)
      item.forEach((child) => {
        delta.insert(child)
      })
      item = delta as any
    } else if (typeof item === 'object' && item !== null) {
      const delta = new MapDelta(this.from)
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
          const data = item instanceof ArrayDelta || item instanceof MapDelta ? item.toJSON() : item
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
      if (item instanceof ArrayDelta || item instanceof MapDelta) {
        return item.toJSON()
      }
      return item
    })
  }

  get(index: number) {
    return this._data[index]
  }
}

export class MapDelta<T extends State> {
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
        if (i instanceof MapDelta || i instanceof ArrayDelta) {
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

    if (!(value as any instanceof MapDelta) &&
      !(value as any instanceof ArrayDelta) &&
      !(value as any instanceof Slot)) {
      if (Array.isArray(value)) {
        const delta = new ArrayDelta(this.from)
        value.forEach((item: any) => {
          delta.insert(item)
        })
        value = delta as any
      } else if (typeof value === 'object' && value !== null) {
        const delta = new MapDelta(this.from)
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
      results[key] = (value instanceof ArrayDelta || value instanceof MapDelta || value instanceof Slot) ? value.toJSON() : value
    })
    return results as T
  }
}
