import { getStringType } from './util'
import { ChangeMarker } from './change-marker'
import { ObjectProxyHandler } from './object-proxy-handler'
import { isModel } from './help'
import { ArrayProxyHandler } from './array-proxy-handler'
import { Slot } from '../model/slot'
import { makeError } from '../_utils/make-error'

const observeErrorFn = makeError('Observe')

export const rawToProxyCache = new WeakMap<object, Model>()
export const proxyToRawCache = new WeakMap<Model, object>()

export const objectChangeMarkerCache = new WeakMap<object, ChangeMarker>()

export function toRaw<T>(value: T): T {
  if (proxyToRawCache.has(value as Model)) {
    return proxyToRawCache.get(value as Model) as T
  }
  return value
}

export function toRaws(items: any[]): any[] {
  return items.map(toRaw)
}

export const defaultObjectReactiveHandler = new ObjectProxyHandler()

export const defaultArrayReactiveHandler = new ArrayProxyHandler()

export interface Model {
  __changeMarker__: ChangeMarker
}

export type ProxyModel<T extends object> = {
  [Key in keyof T]: T[Key] extends Slot ? T[Key] : T[Key] extends object ? ProxyModel<T[Key]> : T[Key]
} & Model

export function observe<T extends object>(raw: T): T {
  if (isModel(raw)) {
    return raw
  }
  let proxy = rawToProxyCache.get(raw) as T
  if (proxy) {
    return proxy
  }
  const type = getStringType(raw)
  switch (type) {
    case '[object Object]':
      proxy = new Proxy(raw as any, defaultObjectReactiveHandler)
      break
    case '[object Array]':
      proxy = new Proxy(raw as any, defaultArrayReactiveHandler)
      break
    case '[object String]':
    case '[object Number]':
    case '[object Boolean]':
    case '[object Undefined]':
    case '[object Null]':
      return raw
    default:
      throw observeErrorFn(`Unsupported data type "${type}"`)
  }
  objectChangeMarkerCache.set(raw, new ChangeMarker(raw))
  rawToProxyCache.set(raw as any, proxy as Model)
  proxyToRawCache.set(proxy as Model, raw)
  return proxy
}

