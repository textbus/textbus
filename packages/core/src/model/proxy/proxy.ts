import { ChangeMarker } from '../change-marker'
import { Slot } from '../slot'
import { Action } from '../types'

export interface Group {
  items: any[]
  isSlot: boolean
}

const proxyCache = new WeakMap<object, any>()

function valueToProxy(value: any) {
  if (value instanceof Slot) {
    return value
  }
  if (Array.isArray(value)) {
    return createArrayProxy(value)
  }
  if (typeof value === 'object' && value !== null) {
    return createObjectProxy(value)
  }
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
      groups.push(item)
    }
  }
  return groups
}

function createArrayProxyHandlers(source: any[], proxy: any, changeMarker: ChangeMarker) {
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
                data: group.items,
                ref: group.items,
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
            unApply: []
          })
          return item
        }
        return this.pop()
      }
    }
  }
}

export function createArrayProxy<T extends any[]>(raw: T): T & {__model__: ChangeMarker} {
  if (proxyCache.has(raw)) {
    return proxyCache.get(raw)
  }
  const changeMarker = new ChangeMarker()
  const proxy = new Proxy(raw, {
    set(target, p, newValue, receiver) {
      console.log('set', p)
      const has = Object.hasOwn(raw, p)
      const oldValue = raw[p]
      const unApplyAction: Action = has ? {
        type: 'propSet',
        key: p as string,
        ref: oldValue,
        value: oldValue,
        isSlot: oldValue instanceof Slot
      } : {
        type: 'propDelete',
        key: p as string
      }

      const b = Reflect.set(target, p, newValue, receiver)
      if (!handlers.ignoreChange) {
        changeMarker.markAsDirtied({
          paths: [],
          apply: [{
            type: 'propSet',
            key: p as string,
            ref: newValue,
            value: newValue,
            isSlot: newValue instanceof Slot
          }],
          unApply: [unApplyAction]
        })
      }
      return b
    },
    get(target, p, receiver) {
      if (p === '__model__') {
        return changeMarker
      }
      if (p === 'pop') {
        return handlers.createPop()
      }
      if (p === 'push') {
        return handlers.createPush()
      }
      const value = Reflect.get(target, p, receiver)
      return valueToProxy(value)
    }
  })
  const handlers = createArrayProxyHandlers(raw, proxy, changeMarker)
  proxyCache.set(raw, proxy)
  return proxy as any
}

export function createObjectProxy<T extends object>(raw: T): T & {__model__: ChangeMarker} {
  return new Proxy(raw, {}) as any
}
