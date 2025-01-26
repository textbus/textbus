import { ChangeMarker } from './change-marker'
import { Slot } from './slot'
import { Action } from './types'

function valueToJSON(value: any): any {
  if (Array.isArray(value)) {
    return arrayToJSON(value)
  }
  if (value instanceof Slot) {
    return value.toJSON()
  }
  if (typeof value === 'object' && value !== null) {
    return objectToJSON(value)
  }
  return value
}

export function objectToJSON(obj: Record<string, any>) {
  const jsonState: Record<string, any> = {}
  Object.entries(obj).forEach(([key, value]) => {
    jsonState[key] = valueToJSON(value)
  })
  return jsonState
}

function arrayToJSON(items: any[]): any[] {
  return items.map(i => valueToJSON(i))
}

const rawToProxyCache = new WeakMap<object, any>()
const proxyRecord = new WeakMap<object, true>

function getType(n: any) {
  const t = Object.prototype.toString.call(n).slice(8)
  return t.substring(0, t.length - 1)
}

export function isType(n: any, type: string) {
  return getType(n) === type
}

export function valueToProxy(value: any, parentModel: ProxyModel<any>) {
  if (value instanceof Slot) {
    value.__changeMarker__.parentModel = parentModel
    return value
  }
  if (Array.isArray(value)) {
    const v = rawToProxyCache.has(value) ? rawToProxyCache.get(value) as ProxyModel<any[]> : createArrayProxy(value) as ProxyModel<any[]>
    v.__changeMarker__.parentModel = parentModel
    return v
  }
  if (isType(value, 'Object')) {
    const v = rawToProxyCache.has(value) ? rawToProxyCache.get(value) as ProxyModel<any> : createObjectProxy(value)
    v.__changeMarker__.parentModel = parentModel
    return v
  }
  return value
}

export function toRaw(item: object) {
  if (proxyRecord.has(item)) {
    return (item as ProxyModel<any>).__changeMarker__.host
  }
  return item
}

export function toRows(items: any[]): any[] {
  return items.map(toRaw)
}

const markKey = '__changeMarker__'
export type ProxyModel<T extends object> = {
  [Key in keyof T]: T[Key] extends Slot ? T[Key] : T[Key] extends object ? ProxyModel<T[Key]> : T[Key]
} & {
  __changeMarker__: ChangeMarker
}

function createArrayProxyHandlers(source: any[],
                                  proxy: any,
                                  changeMarker: ChangeMarker) {
  let ignoreChange = false

  return {
    get ignoreChange() {
      return ignoreChange
    },
    createPush() {
      return function (this: any[], ...args: any[]) {
        if (this === proxy) {
          ignoreChange = true
          const length = source.length
          const result = source.push(...args)
          ignoreChange = false
          changeMarker.markAsDirtied({
            paths: [],
            apply: [{
              type: 'retain',
              offset: length
            }, {
              type: 'insert',
              data: valueToJSON(args),
              ref: args,
            }],
            unApply: [{
              type: 'retain',
              offset: length
            }, {
              type: 'delete',
              count: args.length
            }]
          })
          return result
        }
        return this.push(...args)
      }
    },
    createPop() {
      return function (this: any[]) {
        if (this === proxy) {
          ignoreChange = true
          const offset = source.length
          const item = source.pop()
          const proxy = rawToProxyCache.get(item)
          if (proxy) {
            proxy.__changeMarker__.parentModel = null
          }
          ignoreChange = false
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
        }
        return this.pop()
      }
    },
    createUnshift() {
      return function (this: any[], ...args: any[]) {
        args = toRows(args)
        if (this === proxy) {
          ignoreChange = true
          const result = source.unshift(...args)
          ignoreChange = false
          changeMarker.markAsDirtied({
            paths: [],
            apply: [{
              type: 'retain',
              offset: 0
            }, {
              type: 'insert',
              data: valueToJSON(args),
              ref: args,
            }],
            unApply: [{
              type: 'retain',
              offset: 0
            }, {
              type: 'delete',
              count: args.length
            }]
          })
          return result
        }
        return this.unshift(...args)
      }
    },
    createShift() {
      return function (this: any[]) {
        if (this === proxy) {
          ignoreChange = true
          const item = source.shift()
          const proxy = rawToProxyCache.get(item)
          if (proxy) {
            proxy.__changeMarker__.parentModel = null
          }
          ignoreChange = false
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
        }
        return this.pop()
      }
    },
    createSplice() {
      return function (this: any[], startIndex: number, deleteCount?: number, ...args: any[]) {
        args = toRows(args)
        if (this === proxy) {
          ignoreChange = true
          if (typeof deleteCount !== 'number') {
            deleteCount = source.length
          }
          if (deleteCount < 0) {
            deleteCount = 0
          }
          const deletedItems = source.splice(startIndex, deleteCount, ...args)
          deletedItems.forEach(i => {
            const proxy = rawToProxyCache.get(i)
            if (proxy) {
              proxy.__changeMarker__.parentModel = null
            }
          })
          ignoreChange = false
          const index = startIndex
          changeMarker.markAsDirtied({
            paths: [],
            apply: [{
              type: 'retain',
              offset: index
            }, {
              type: 'delete',
              count: deletedItems.length
            }],
            unApply: [{
              type: 'retain',
              offset: index
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
              offset: startIndex
            }, {
              type: 'insert',
              data: valueToJSON(args),
              ref: args.map(i => {
                return valueToProxy(i, proxy)
              })
            }],
            unApply: [{
              type: 'retain',
              offset: startIndex
            }, {
              type: 'delete',
              count: args.length
            }]
          })
          return deletedItems
        }
        return this.push(...args)
      }
    }
  }
}

export function createArrayProxy<T extends any[]>(raw: T): T {
  if (proxyRecord.has(raw)) {
    return raw
  }
  if (rawToProxyCache.has(raw)) {
    return rawToProxyCache.get(raw)
  }
  const changeMarker = new ChangeMarker(raw)
  const proxy: any = new Proxy(raw, {
    set(target, p, newValue, receiver) {
      if (p === 'length') {
        return Reflect.set(target, p, newValue, receiver)
      }
      newValue = toRaw(newValue)
      const oldValue = (raw as any)[p]
      const proxy = rawToProxyCache.get(oldValue)
      if (proxy) {
        proxy.__changeMarker__.parentModel = null
      }
      const length = raw.length

      const b = Reflect.set(target, p, newValue, receiver)

      if (newValue === oldValue) {
        return b
      }

      if (!handlers.ignoreChange && /^(0|[1-9]\d*)$/.test(p as string)) {
        const index = Number(p)
        changeMarker.markAsDirtied({
          paths: [],
          apply: [{
            type: 'setIndex',
            index,
            afterLength: raw.length,
            value: valueToJSON(newValue),
            ref: valueToProxy(newValue, proxy as ProxyModel<T>),
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
      return b
    },
    get(target, p, receiver) {
      if (p === markKey) {
        return changeMarker
      }
      if (p === 'pop') {
        return handlers.createPop()
      }
      if (p === 'push') {
        return handlers.createPush()
      }
      if (p === 'shift') {
        return handlers.createShift()
      }
      if (p === 'unshift') {
        return handlers.createUnshift()
      }
      if (p === 'splice') {
        return handlers.createSplice()
      }
      const value = Reflect.get(target, p, receiver)

      return valueToProxy(value, proxy)
    }
  })
  const handlers = createArrayProxyHandlers(raw, proxy, changeMarker)
  rawToProxyCache.set(raw, proxy)
  proxyRecord.set(proxy, true)
  return proxy as any
}

export function createObjectProxy<T extends object>(raw: T): T {
  if (proxyRecord.has(raw)) {
    return raw
  }
  if (rawToProxyCache.has(raw)) {
    return rawToProxyCache.get(raw)
  }
  const changeMarker = new ChangeMarker(raw)
  const proxy: any = new Proxy(raw, {
    get(target, p, receiver) {
      if (p === markKey) {
        return changeMarker
      }
      const value = Reflect.get(target, p, receiver)
      return valueToProxy(value, proxy)
    },
    set(target, p, newValue, receiver) {
      newValue = toRaw(newValue)
      const has = Object.hasOwn(raw, p)
      const oldValue = (raw as any)[p]
      const proxy = rawToProxyCache.get(oldValue)
      if (proxy) {
        proxy.__changeMarker__.parentModel = null
      }
      const b = Reflect.set(target, p, newValue, receiver)
      if (newValue === oldValue) {
        return b
      }
      const unApplyAction: Action = has ? {
        type: 'propSet',
        key: p as string,
        value: valueToJSON(oldValue),
        ref: null,
      } : {
        type: 'propDelete',
        key: p as string
      }
      changeMarker.markAsDirtied({
        paths: [],
        apply: [{
          type: 'propSet',
          key: p as string,
          value: valueToJSON(newValue),
          ref: valueToProxy(newValue, proxy as ProxyModel<T>),
        }],
        unApply: [unApplyAction]
      })
      return b
    },
    deleteProperty(target, p) {
      const has = Object.hasOwn(raw, p)
      const oldValue = (raw as any)[p]
      const proxy = rawToProxyCache.get(oldValue)
      if (proxy) {
        proxy.__changeMarker__.parentModel = null
      }
      const b = Reflect.deleteProperty(target, p)
      changeMarker.markAsDirtied({
        paths: [],
        apply: [{
          type: 'propDelete',
          key: p as string
        }],
        unApply: has ? [{
          type: 'propSet',
          key: p as string,
          value: valueToJSON(oldValue),
          ref: null,
        }] : []
      })
      return b
    },
  })
  rawToProxyCache.set(raw, proxy)
  proxyRecord.set(proxy, true)
  return proxy as any
}
