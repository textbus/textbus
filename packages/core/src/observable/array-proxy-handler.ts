import { ObjectProxyHandler } from './object-proxy-handler'
import { Model, observe, toRaw, toRaws } from './observe'
import { attachModel, detachModel, getChangeMarker, getObserver, isModel } from './help'
import { valueToJSON } from './util'

function toSubModels(items: any[], parentModel: Model) {
  return items.map(item => {
    const subModel = observe(item)
    attachModel(parentModel, subModel)
    return subModel
  })
}

/** 从 oldArr 中多出的引用（相对 newArr 多重集）执行 detach */
function detachMultisetsDifference(oldArr: readonly any[], newArr: readonly any[]) {
  const counts = new Map<any, number>()
  for (const item of newArr) {
    const r = toRaw(item)
    counts.set(r, (counts.get(r) || 0) + 1)
  }
  for (const item of oldArr) {
    const r = toRaw(item)
    const c = counts.get(r) || 0
    if (c <= 0) {
      detachModel(item)
    } else {
      counts.set(r, c - 1)
    }
  }
}

function defaultSortCompare(a: unknown, b: unknown): number {
  const sa = String(a)
  const sb = String(b)
  return sa < sb ? -1 : sa > sb ? 1 : 0
}

function markArrayFullReplace(
  self: Model,
  changeMarker: NonNullable<ReturnType<typeof getChangeMarker>>,
  source: any[],
  beforeSnapshot: any[]
) {
  const lenBefore = beforeSnapshot.length
  const lenAfter = source.length
  const beforeJSON = valueToJSON(beforeSnapshot)
  const subModels = source.map(item => {
    const m = observe(item)
    attachModel(self, m)
    return m
  })
  changeMarker.markAsDirtied({
    paths: [],
    apply: [{
      type: 'retain',
      offset: 0
    }, {
      type: 'delete',
      count: lenBefore
    }, {
      type: 'insert',
      data: valueToJSON(source),
      ref: subModels,
    }],
    unApply: [{
      type: 'retain',
      offset: 0
    }, {
      type: 'delete',
      count: lenAfter
    }, {
      type: 'insert',
      data: beforeJSON,
      ref: null
    }]
  })
}

function asObservableReturn<T>(v: T): T {
  if (v === null || v === undefined) {
    return v
  }
  if (typeof v !== 'object') {
    return v
  }
  return observe(v as object) as T
}

function applySearchMethod(self: any, methodName: string, args: unknown[]) {
  const target = toRaw(self)
  return target[methodName](...args.map(toRaw))
}

const arrayMethodsHandlers = {
  indexOf(...args: unknown[]) {
    return applySearchMethod(this, 'indexOf', args)
  },
  lastIndexOf(...args: unknown[]) {
    return applySearchMethod(this, 'lastIndexOf', args)
  },
  includes(...args: unknown[]) {
    return applySearchMethod(this, 'includes', args)
  },
  toString(this: any) {
    return applySearchMethod(this, 'toString', [])
  },
  toLocaleString(this: any, ...args: unknown[]) {
    return applySearchMethod(this, 'toLocaleString', args)
  },

  slice(...args: unknown[]) {
    return applySearchMethod(this, 'slice', args)
  },
  concat(...args: unknown[]) {
    return applySearchMethod(this, 'concat', args)
  },
  flat(...args: unknown[]) {
    return applySearchMethod(this, 'flat', args)
  },
  toReversed(this: any) {
    const t = toRaw(this) as any[]
    const raw = typeof (Array.prototype as any).toReversed === 'function'
      ? (Array.prototype as any).toReversed.call(t)
      : [...t].reverse()
    return raw
  },
  toSorted(this: any, compareFn?: (a: any, b: any) => number) {
    const t = toRaw(this) as any[]
    const raw = typeof (Array.prototype as any).toSorted === 'function'
      ? (Array.prototype as any).toSorted.call(t, compareFn)
      : [...t].sort(compareFn)
    return raw
  },
  toSpliced(this: any, start: number, deleteCount: number, ...items: any[]) {
    const t = toRaw(this) as any[]
    const raw = typeof (Array.prototype as any).toSpliced === 'function'
      ? (Array.prototype as any).toSpliced.call(t, start, deleteCount, ...toRaws(items))
      : (() => {
        const c = [...t]
        c.splice(start, deleteCount, ...toRaws(items))
        return c
      })()
    return raw
  },
  with(this: any, index: number, value: any) {
    const t = toRaw(this) as any[]
    const raw = typeof (Array.prototype as any).with === 'function'
      ? (Array.prototype as any).with.call(t, index, toRaw(value))
      : (() => {
        const c = [...t]
        c[index] = toRaw(value)
        return c
      })()
    return raw
  },

  push(this: any, ...items: any[]): number {
    items = toRaws(items)
    const target = toRaw(this) as any[]
    const changeMarker = getChangeMarker(this)!
    changeMarker.beforeChange()
    const length = target.length
    const subModels = toSubModels(items, this as Model)
    const result = target.push(...items)
    changeMarker.markAsDirtied({
      paths: [],
      apply: [{
        type: 'retain',
        offset: length
      }, {
        type: 'insert',
        data: valueToJSON(items),
        ref: subModels,
      }],
      unApply: [{
        type: 'retain',
        offset: length
      }, {
        type: 'delete',
        count: items.length
      }]
    })
    return result
  },
  pop(this: any): any | undefined {
    const source = toRaw(this) as any[]
    const changeMarker = getChangeMarker(this)!
    changeMarker.beforeChange()
    const offset = source.length
    const item = source.pop()
    detachModel(item)
    changeMarker.markAsDirtied({
      paths: [],
      apply: [{
        type: 'retain',
        offset: offset - 1
      }, {
        type: 'delete',
        count: 1
      }],
      unApply: [{
        type: 'retain',
        offset: offset - 1
      }, {
        type: 'insert',
        data: valueToJSON([item]),
        ref: null
      }]
    })
    return asObservableReturn(item)
  },
  shift(this: any): any | undefined {
    const source = toRaw(this) as any[]
    const offset = source.length
    if (offset === 0) {
      return
    }
    const changeMarker = getChangeMarker(this)!
    changeMarker.beforeChange()
    const item = source.shift()
    detachModel(item)
    changeMarker.markAsDirtied({
      paths: [],
      apply: [{
        type: 'retain',
        offset: 0
      }, {
        type: 'delete',
        count: 1
      }],
      unApply: [{
        type: 'retain',
        offset: 0
      }, {
        type: 'insert',
        data: valueToJSON([item]),
        ref: null,
      }]
    })
    return asObservableReturn(item)
  },
  unshift(this: any, ...items: any[]): number {
    const source = toRaw(this) as any[]
    items = toRaws(items)
    const changeMarker = getChangeMarker(this)!
    changeMarker.beforeChange()

    const subModels = toSubModels(items, this as Model)
    const result = source.unshift(...items)
    changeMarker.markAsDirtied({
      paths: [],
      apply: [{
        type: 'retain',
        offset: 0
      }, {
        type: 'insert',
        data: valueToJSON(items),
        ref: subModels,
      }],
      unApply: [{
        type: 'retain',
        offset: 0
      }, {
        type: 'delete',
        count: items.length
      }]
    })
    return result
  },
  splice(this: any, start: number, deleteCount?: number, ...items: any[]): any[] {
    const source = toRaw(this) as any[]
    if (start > source.length) {
      arrayMethodsHandlers.push.call(this, ...items)
      return []
    }
    if (typeof deleteCount !== 'number') {
      deleteCount = source.length - start
    }
    if (deleteCount < 0) {
      deleteCount = 0
    }

    const changeMarker = getChangeMarker(this)!
    changeMarker.beforeChange()

    items = toRaws(items)
    const subModels = toSubModels(items, this as Model)
    const deletedItems = source.splice(start, deleteCount, ...items)
    detachModel(...deletedItems)
    changeMarker.markAsDirtied({
      paths: [],
      apply: [{
        type: 'retain',
        offset: start
      }, {
        type: 'delete',
        count: deletedItems.length
      }, {
        type: 'insert',
        data: valueToJSON(items),
        ref: subModels
      }],
      unApply: [{
        type: 'retain',
        offset: start
      }, {
        type: 'delete',
        count: items.length
      }, {
        type: 'insert',
        data: valueToJSON(deletedItems),
        ref: null
      }]
    })
    return deletedItems.map(asObservableReturn)
  },
  sort(this: any, compareFn?: (a: any, b: any) => number): any {
    const source = toRaw(this) as any[]
    const before = [...source]
    const self = this as Model
    const wrapForCompare = (x: any) => {
      if (x === null || typeof x !== 'object') {
        return x
      }
      const m = observe(x)
      if (isModel(m)) {
        attachModel(self, m)
      }
      return m
    }
    if (compareFn) {
      Array.prototype.sort.call(source, (a, b) => compareFn(wrapForCompare(a), wrapForCompare(b)))
    } else {
      Array.prototype.sort.call(source, (a, b) => defaultSortCompare(toRaw(a), toRaw(b)))
    }
    if (valueToJSON(before) === valueToJSON(source)) {
      return this
    }
    const changeMarker = getChangeMarker(this)!
    changeMarker.beforeChange()
    detachMultisetsDifference(before, source)
    markArrayFullReplace(self, changeMarker, source, before)
    return this
  },
  reverse(this: any): any {
    const source = toRaw(this) as any[]
    const before = [...source]
    Array.prototype.reverse.call(source)
    if (valueToJSON(before) === valueToJSON(source)) {
      return this
    }
    const changeMarker = getChangeMarker(this)!
    changeMarker.beforeChange()
    detachMultisetsDifference(before, source)
    markArrayFullReplace(this as Model, changeMarker, source, before)
    return this
  },
  fill(this: any, value: any, start?: number, end?: number): any {
    const source = toRaw(this) as any[]
    const before = [...source]
    Array.prototype.fill.call(source, toRaw(value), start, end)
    if (valueToJSON(before) === valueToJSON(source)) {
      return this
    }
    const changeMarker = getChangeMarker(this)!
    changeMarker.beforeChange()
    detachMultisetsDifference(before, source)
    markArrayFullReplace(this as Model, changeMarker, source, before)
    return this
  },
  copyWithin(this: any, target: number, start: number, end?: number): any {
    const source = toRaw(this) as any[]
    const before = [...source]
    Array.prototype.copyWithin.call(source, target, start, end)
    if (valueToJSON(before) === valueToJSON(source)) {
      return this
    }
    const changeMarker = getChangeMarker(this)!
    changeMarker.beforeChange()
    detachMultisetsDifference(before, source)
    markArrayFullReplace(this as Model, changeMarker, source, before)
    return this
  }
}

export class ArrayProxyHandler<T extends Array<any>> extends ObjectProxyHandler<T> {
  override set(target: T, p: string | symbol, newValue: any, receiver: any): boolean {
    if (p === 'length') {
      const num = Number(newValue)
      if (!Number.isFinite(num) || num < 0) {
        return Reflect.set(target, p, newValue, receiver)
      }
      const newLen = num >>> 0
      const oldLen = target.length
      if (newLen === oldLen) {
        return Reflect.set(target, p, newValue, receiver)
      }
      const changeMarker = getChangeMarker(target)!
      changeMarker.beforeChange()
      const parentModel = getObserver(target)!
      const removedForUndo = newLen < oldLen ? target.slice(newLen) : []
      if (newLen < oldLen) {
        removedForUndo.forEach(el => detachModel(el))
      }
      const ok = Reflect.set(target, p, newValue, receiver)
      if (!ok) {
        return false
      }
      if (newLen < oldLen) {
        changeMarker.markAsDirtied({
          paths: [],
          apply: [{
            type: 'retain',
            offset: newLen
          }, {
            type: 'delete',
            count: oldLen - newLen
          }],
          unApply: [{
            type: 'retain',
            offset: newLen
          }, {
            type: 'insert',
            data: valueToJSON(removedForUndo),
            ref: null
          }]
        })
      } else {
        const newTail: any[] = []
        for (let i = oldLen; i < newLen; i++) {
          newTail.push((target as any)[i])
        }
        const subModels = toSubModels(newTail, parentModel)
        changeMarker.markAsDirtied({
          paths: [],
          apply: [{
            type: 'retain',
            offset: oldLen
          }, {
            type: 'insert',
            data: valueToJSON(newTail),
            ref: subModels,
          }],
          unApply: [{
            type: 'retain',
            offset: oldLen
          }, {
            type: 'delete',
            count: newLen - oldLen
          }]
        })
      }
      return ok
    }
    if (/^(0|[1-9]\d*)$/.test(p as string)) {
      newValue = toRaw(newValue)
      const oldValue = Reflect.get(target, p)
      const lengthBefore = target.length
      detachModel(oldValue)
      const b = Reflect.set(target, p, newValue, receiver)
      if (newValue === oldValue) {
        return b
      }
      const changeMarker = getChangeMarker(target)!
      changeMarker.beforeChange()
      const subModel = observe(newValue)
      const parentModel = getObserver(target)!
      attachModel(parentModel, subModel)
      const index = Number(p)
      changeMarker.markAsDirtied({
        paths: [],
        apply: [{
          type: 'setIndex',
          index,
          afterLength: target.length,
          value: valueToJSON(newValue),
          ref: subModel,
        }],
        unApply: [{
          type: 'setIndex',
          index,
          afterLength: lengthBefore,
          value: valueToJSON(oldValue),
          ref: null
        }]
      })
      return b
    }

    return super.set(target, p, newValue, receiver)
  }

  override get(target: T, p: string | symbol, receiver: any): any {
    if (p in target) {
      if (Reflect.has(arrayMethodsHandlers, p)) {
        return arrayMethodsHandlers[p as keyof typeof arrayMethodsHandlers]
      }
      // 忽略其它原型方法
      if (!Object.hasOwn(target, p)) {
        return Reflect.get(target, p)
      }
    }
    return super.get(target, p, receiver)
  }
}
