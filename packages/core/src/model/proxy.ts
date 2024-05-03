import { ChangeMarker } from './change-marker'
import { Slot } from './slot'
import { Action } from './types'
import { Component } from './component'

export interface Group {
  items: any[]
  isSlot: boolean
}

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

const proxyCache = new WeakMap<object, any>()

function getType(n: any) {
  const t = Object.prototype.toString.call(n).slice(8)
  return t.substring(0, t.length - 1)
}

function isType(n: any, type: string) {
  return getType(n) === type
}

function valueToProxy(value: any, component: Component<any>, init: (parentChangeMarker: ChangeMarker) => void) {
  if (value instanceof Slot) {
    value.parent = component
    init(value.changeMarker)
    return value
  }
  if (Array.isArray(value)) {
    if (proxyCache.has(value)) {
      return proxyCache.get(value)
    }
    const v = createArrayProxy(value, component) as ProxyModel<any[]>
    init(v.__changeMarker__)
    return v
  }
  if (isType(value, 'Object')) {
    if (proxyCache.has(value)) {
      return proxyCache.get(value)
    }
    const v = createObjectProxy(value, component)
    init(v.__changeMarker__)
    return v
  }
  // if (value === null || value === void 0) {
  //   return value
  // }
  //
  // console.error(`Textbus data model does not support the "${getType(value)}" type `)

  return value
}

function toGroup(args: any[]) {
  const groups: Group[] = []
  let group: Group | null = null

  for (const item of args) {
    const isSlot = item instanceof Slot
    if (!group) {
      group = {
        isSlot,
        items: [item]
      }
      groups.push(group)
      continue
    }
    if (group.isSlot === isSlot) {
      group.items.push(item)
    } else {
      group = {
        isSlot,
        items: [item]
      }
      groups.push(group)
    }
  }
  return groups
}

export function toRaw(item: object) {
  if (proxyCache.has(item)) {
    return proxyCache.get(item)
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

function track(value: any,
               component: Component<any>,
               recordChildSlot: WeakMap<Slot, true>,
               changeMarker: ChangeMarker,
               getKey: (value: any) => string | number) {
  return valueToProxy(value, component, childChangeMarker => {
    if (value instanceof Slot) {
      if (recordChildSlot.has(value)) {
        return
      }
      recordChildSlot.set(value, true)
    }
    const sub = childChangeMarker.onChange.subscribe(ops => {
      ops.paths.unshift(getKey(value))
      component.changeMarker.reset()
      changeMarker.markAsChanged(ops)
    })
    sub.add(childChangeMarker.onForceChange.subscribe(() => {
      if (childChangeMarker.dirty) {
        component.changeMarker.forceMarkDirtied()
      } else {
        component.changeMarker.forceMarkChanged()
      }
    }))
    sub.add(childChangeMarker.onTriggerPath.subscribe(paths => {
      paths.unshift(getKey(value))
      changeMarker.triggerPath(paths)
    }))
    changeMarker.destroyCallbacks.push(() => {
      sub.unsubscribe()
    })
  })
}

function createArrayProxyHandlers(source: any[],
                                  proxy: any,
                                  changeMarker: ChangeMarker,
                                  component: Component<any>,
                                  recordChildSlot: WeakMap<Slot, true>) {
  let ignoreChange = false

  return {
    get ignoreChange() {
      return ignoreChange
    },
    createPush() {
      return function (this: any[], ...args: any[]) {
        if (this === proxy) {
          ignoreChange = true
          let length = source.length
          const groups = toGroup(args)
          const result = source.push(...args)
          ignoreChange = false
          groups.forEach(group => {
            changeMarker.markAsDirtied({
              paths: [],
              apply: [{
                type: 'retain',
                offset: length
              }, {
                type: 'insert',
                data: valueToJSON(group.items),
                ref: group.items.map(i => {
                  return track(i, component, recordChildSlot, changeMarker, v => source.indexOf(v))
                }),
                isSlot: group.isSlot
              }],
              unApply: [{
                type: 'retain',
                offset: length
              }, {
                type: 'delete',
                count: group.items.length
              }]
            })
            length += group.items.length
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
              ref: [item],
              isSlot: item instanceof Slot
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
          const groups = toGroup(args)
          const result = source.unshift(...args)
          ignoreChange = false
          let index = 0
          groups.forEach(group => {
            changeMarker.markAsDirtied({
              paths: [],
              apply: [{
                type: 'retain',
                offset: index
              }, {
                type: 'insert',
                data: valueToJSON(group.items),
                ref: group.items.map(i => {
                  return track(i, component, recordChildSlot, changeMarker, v => source.indexOf(v))
                }),
                isSlot: group.isSlot
              }],
              unApply: [{
                type: 'retain',
                offset: index
              }, {
                type: 'delete',
                count: group.items.length
              }]
            })
            index += group.items.length
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
              ref: [item],
              isSlot: item instanceof Slot
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
          const groups = toGroup(args)
          if (typeof deleteCount !== 'number') {
            deleteCount = source.length
          }
          if (deleteCount < 0) {
            deleteCount = 0
          }
          const deletedItems = source.splice(startIndex, deleteCount, ...args)
          ignoreChange = false
          const deletedGroups = toGroup(deletedItems)
          let index = startIndex
          deletedGroups.forEach(group => {
            changeMarker.markAsDirtied({
              paths: [],
              apply: [{
                type: 'retain',
                offset: index
              }, {
                type: 'delete',
                count: group.items.length
              }],
              unApply: [{
                type: 'retain',
                offset: index
              }, {
                type: 'insert',
                data: valueToJSON(group.items),
                ref: group.items,
                isSlot: group.isSlot
              }]
            })
            index += group.items.length
          })

          groups.forEach(group => {
            changeMarker.markAsDirtied({
              paths: [],
              apply: [{
                type: 'retain',
                offset: startIndex
              }, {
                type: 'insert',
                data: valueToJSON(group.items),
                ref: group.items.map(i => {
                  return track(i, component, recordChildSlot, changeMarker, v => source.indexOf(v))
                }),
                isSlot: group.isSlot
              }],
              unApply: [{
                type: 'retain',
                offset: startIndex
              }, {
                type: 'delete',
                count: group.items.length
              }]
            })
            startIndex += group.items.length
          })
          return deletedItems
        }
        return this.push(...args)
      }
    }
  }
}

export function createArrayProxy<T extends any[]>(raw: T, component: Component<any>): T {
  if (proxyCache.has(raw)) {
    return proxyCache.get(raw)
  }
  const changeMarker = new ChangeMarker()
  const recordChildSlot = new WeakMap<Slot, true>()
  const proxy = new Proxy(raw, {
    set(target, p, newValue, receiver) {
      if (p === 'length') {
        return Reflect.set(target, p, newValue, receiver)
      }
      if (proxyCache.has(newValue)) {
        newValue = proxyCache.get(newValue)
      }
      const oldValue = raw[p]
      const length = raw.length

      const b = Reflect.set(target, p, newValue, receiver)

      if (!handlers.ignoreChange && /^(0|[1-9]\d*)$/.test(p as string)) {
        const index = Number(p)
        changeMarker.markAsDirtied({
          paths: [],
          apply: [{
            type: 'setIndex',
            index,
            afterLength: raw.length,
            value: valueToJSON(newValue),
            ref: track(newValue, component, recordChildSlot, changeMarker, () => {
              return p as string
            }),
            isSlot: newValue instanceof Slot
          }],
          unApply: [{
            type: 'setIndex',
            index,
            afterLength: length,
            value: valueToJSON(oldValue),
            ref: oldValue,
            isSlot: oldValue instanceof Slot
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

      return track(value, component, recordChildSlot, changeMarker, v => {
        return raw.indexOf(v)
      })
    }
  })
  const handlers = createArrayProxyHandlers(raw, proxy, changeMarker, component, recordChildSlot)
  proxyCache.set(raw, proxy)
  return proxy as any
}

export function createObjectProxy<T extends object>(raw: T, component: Component): T {
  if (proxyCache.has(raw)) {
    return proxyCache.get(raw)
  }
  const changeMarker = new ChangeMarker()
  const recordChildSlot = new WeakMap<Slot, true>()
  const proxy = new Proxy(raw, {
    get(target, p, receiver) {
      if (p === markKey) {
        return changeMarker
      }
      const value = Reflect.get(target, p, receiver)
      return track(value, component, recordChildSlot, changeMarker, () => {
        return p as string
      })
    },
    set(target, p, newValue, receiver) {
      if (proxyCache.has(newValue)) {
        newValue = proxyCache.get(newValue)
      }
      const has = Object.hasOwn(raw, p)
      const oldValue = raw[p]
      const b = Reflect.set(target, p, newValue, receiver)
      const unApplyAction: Action = has ? {
        type: 'propSet',
        key: p as string,
        value: oldValue,
        ref: oldValue,
        isSlot: oldValue instanceof Slot
      } : {
        type: 'propDelete',
        key: p as string
      }
      changeMarker.markAsDirtied({
        paths: [],
        apply: [{
          type: 'propSet',
          key: p as string,
          value: newValue,
          ref: track(newValue, component, recordChildSlot, changeMarker, () => p as string),
          isSlot: newValue instanceof Slot,
        }],
        unApply: [unApplyAction]
      })
      return b
    },
    deleteProperty(target, p) {
      const has = Object.hasOwn(raw, p)
      const oldValue = raw[p]
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
          value: oldValue,
          ref: oldValue,
          isSlot: oldValue instanceof Slot
        }] : []
      })
      return b
    },
  })
  proxyCache.set(raw, proxy)
  return proxy as any
}
