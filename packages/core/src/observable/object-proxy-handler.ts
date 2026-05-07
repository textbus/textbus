import { Action } from '../model/types'
import { getStringType, valueToJSON } from './util'
import { Model, objectChangeMarkerCache, observe, toRaw } from './observe'
import { attachModel, detachModel, getObserver, isModel } from './help'

const markKey = '__changeMarker__'

function shouldLinkChildOnGet(target: object, p: string | symbol): boolean {
  if (Object.hasOwn(target, p)) {
    return true
  }
  if (Array.isArray(target) && typeof p === 'string' && /^[0-9]+$/.test(p) && p in (target as unknown[])) {
    return true
  }
  return false
}

export class ObjectProxyHandler<T extends object> implements ProxyHandler<T> {
  set(target: T, p: string | symbol, newValue: any, receiver: any): boolean {
    newValue = toRaw(newValue)
    const has = Reflect.has(target, p)
    const oldValue = (target as any)[p]

    const b = Reflect.set(target, p, newValue, receiver)
    if (oldValue === newValue) {
      return b
    }

    const parentModel = getObserver(target)!
    const changeMarker = parentModel.__changeMarker__
    changeMarker.beforeChange()

    detachModel(oldValue)

    const unApplyAction: Action = has ? {
      type: 'propSet',
      key: p as string,
      value: valueToJSON(oldValue),
      ref: null,
    } : {
      type: 'propDelete',
      key: p as string
    }
    const subModel = observe(newValue)
    attachModel(parentModel, subModel)

    changeMarker.markAsDirtied({
      paths: [],
      apply: [{
        type: 'propSet',
        key: p as string,
        value: valueToJSON(newValue),
        ref: subModel,
      }],
      unApply: [unApplyAction]
    })
    return b
  }

  get(target: T, p: string | symbol, receiver: any): any {
    if (p === markKey) {
      return objectChangeMarkerCache.get(target)
    }
    const value = Reflect.get(target, p, receiver)
    if (!shouldLinkChildOnGet(target, p)) {
      return value
    }
    const subModel = observe(value as any)
    const parent = getObserver(target)!
    if (isModel(subModel)) {
      attachModel(parent, subModel)
    }
    return subModel
  }

  getOwnPropertyDescriptor(target: T, p: string | symbol) {
    const d = Reflect.getOwnPropertyDescriptor(target, p)
    if (!d || !('value' in d) || d.value === null) {
      return d
    }
    const value = d.value
    if (typeof value !== 'object') {
      return d
    }
    if (isModel(value)) {
      return d
    }
    const type = getStringType(value)
    if (type !== '[object Object]' && type !== '[object Array]') {
      return d
    }
    const subModel = observe(value as object)
    const parent = getObserver(target)!
    if (isModel(subModel)) {
      attachModel(parent, subModel)
    }
    return {
      ...d,
      value: subModel,
    }
  }

  deleteProperty(target: T, p: string | symbol): boolean {
    const has = Reflect.has(target, p)
    const oldValue = (target as any)[p]
    const changeMarker = getObserver(target)!.__changeMarker__
    changeMarker.beforeChange()

    detachModel(oldValue)
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
  }
}
