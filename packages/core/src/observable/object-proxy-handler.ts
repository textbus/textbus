import { Action } from '../model/types'
import { valueToJSON } from './util'
import { Model, objectChangeMarkerCache, observe, toRaw } from './observe'
import { attachModel, detachModel, getObserver } from './help'

const markKey = '__changeMarker__'

export class ObjectProxyHandler<T extends object> implements ProxyHandler<T> {
  set(target: T, p: string | symbol, newValue: any, receiver: any): boolean {
    newValue = toRaw(newValue)
    const has = Reflect.has(target, p)
    const oldValue = (target as any)[p]

    const b = Reflect.set(target, p, newValue, receiver)
    if (oldValue === newValue) {
      return b
    }

    detachModel(oldValue)
    const parentModel = getObserver(target)!
    const changeMarker = parentModel.__changeMarker__

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
    const has = Object.hasOwn(target, p)
    const value = Reflect.get(target, p, receiver)
    if (!has) {
      return value
    }
    const subModel = observe(value as any)
    attachModel(getObserver(target)!, subModel as unknown as Model)
    return subModel
  }

  deleteProperty(target: T, p: string | symbol): boolean {
    const has = Reflect.has(target, p)
    const oldValue = (target as any)[p]

    detachModel(oldValue)
    const b = Reflect.deleteProperty(target, p)
    const changeMarker = getObserver(target)!.__changeMarker__
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
