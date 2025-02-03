import { Slot } from '../model/slot'

const hasOwnProperty = Object.prototype.hasOwnProperty

export function hasOwn(target: any, key: any) {
  return hasOwnProperty.call(target, key)
}

const toStr = Object.prototype.toString

export function getStringType(v: any) {
  return toStr.call(v)
}

export function isType(v: any, type: string): boolean {
  return getStringType(v) === `[object ${type}]`
}

export function valueToJSON(value: any): any {
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

export function arrayToJSON(items: any[]): any[] {
  return items.map(i => valueToJSON(i))
}
