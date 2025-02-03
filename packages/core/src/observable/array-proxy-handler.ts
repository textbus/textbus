import { ObjectProxyHandler } from './object-proxy-handler'
import { Model, observe, toRaw, toRaws } from './observe'
import { attachModel, detachModel, getChangeMarker, getObserver } from './help'
import { valueToJSON } from './util'

function toSubModels(items: any[], parentModel: Model) {
  return items.map(item => {
    const subModel = observe(item)
    attachModel(parentModel, subModel)
    return subModel
  })
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
  push(this: any, ...items: any[]): number {
    items = toRaws(items)
    const target = toRaw(this) as any[]
    const changeMarker = getChangeMarker(this)!
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
    const offset = source.length
    const item = source.pop()
    detachModel(item)
    const changeMarker = getChangeMarker(this)!
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
    return item
  },
  shift(this: any): any | undefined {
    const source = toRaw(this) as any[]
    const offset = source.length
    if (offset === 0) {
      return
    }
    const item = source.shift()
    detachModel(item)
    const changeMarker = getChangeMarker(this)!
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
    return item
  },
  unshift(this: any, ...items: any[]): number {
    const source = toRaw(this) as any[]
    items = toRaws(items)

    const subModels = toSubModels(items, this as Model)
    const result = source.unshift(...items)
    const changeMarker = getChangeMarker(this)!
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

    items = toRaws(items)
    const subModels = toSubModels(items, this as Model)
    const deletedItems = source.splice(start, deleteCount, ...items)
    detachModel(...deletedItems)
    const changeMarker = getChangeMarker(this)!
    changeMarker.markAsDirtied({
      paths: [],
      apply: [{
        type: 'retain',
        offset: start
      }, {
        type: 'delete',
        count: deletedItems.length
      }],
      unApply: [{
        type: 'retain',
        offset: start
      }, {
        type: 'insert',
        data: valueToJSON(deletedItems),
        ref: null,
      }]
    })
    changeMarker.markAsDirtied({
      paths: [],
      apply: [{
        type: 'retain',
        offset: start
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
      }]
    })
    return deletedItems
  },
  // sort(compareFn?: (a: T, b: T) => number): this {
  // },
  // reverse(): T[] {
  // },
  // fill(value: T, start?: number, end?: number): this {
  // },
  // copyWithin(target: number, start: number, end?: number): this {
  // }
}

export class ArrayProxyHandler<T extends Array<any>> extends ObjectProxyHandler<T> {
  override set(target: T, p: string | symbol, newValue: any, receiver: any): boolean {
    if (p === 'length') {
      return Reflect.set(target, p, newValue, receiver)
      // if (typeof newValue !== 'number' || Number.isNaN(newValue)) {
      //   return Reflect.set(target, p, newValue, receiver)
      // }
      // const length = target.length
      // const changeMarker = getObserver(target)!.__changeMarker__
      // if (newValue > length) {
      //   target.push(...new Array(newValue - length).fill(undefined))
      //   changeMarker.markAsChanged({
      //     paths: [],
      //     apply: [{
      //
      //     }]
      //   })
      // }
    }
    if (/^(0|[1-9]\d*)$/.test(p as string)) {
      newValue = toRaw(newValue)
      const oldValue = Reflect.get(target, p)
      detachModel(oldValue)
      const b = Reflect.set(target, p, newValue, receiver)
      if (newValue === oldValue) {
        return b
      }
      const subModel = observe(newValue)
      const changeMarker = getChangeMarker(target)!
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
          afterLength: length,
          value: valueToJSON(oldValue),
          ref: null
        }]
      })
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
