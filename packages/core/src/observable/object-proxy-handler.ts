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

  /**
   * {@link Reflect.defineProperty} 会直接在 target 上落盘，不经过 {@link set}，
   * 需在此补上与 set 一致的 observe / attachModel / 变更记录，否则子模型拿不到 parentModel。
   */
  defineProperty(target: T, p: string | symbol, desc: PropertyDescriptor): boolean {
    if (p === markKey) {
      return false
    }
    if (typeof desc.get === 'function' || typeof desc.set === 'function') {
      return Reflect.defineProperty(target, p, desc)
    }
    if (!('value' in desc)) {
      return Reflect.defineProperty(target, p, desc)
    }

    const newValue = toRaw(desc.value as any)
    const has = Reflect.has(target, p)
    const oldValue = has ? (target as any)[p] : undefined
    const ok = Reflect.defineProperty(target, p, { ...desc, value: newValue })
    if (!ok) {
      return false
    }
    if (oldValue === newValue) {
      return true
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
    return true
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
