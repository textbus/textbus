import { Model, proxyToRawCache, rawToProxyCache } from './observe'
import { Slot } from '../model/slot'
import { Component } from '../model/component'
import { ChangeMarker } from './change-marker'
import { makeError } from '../_utils/make-error'

export function isModel(value: any): value is Model {
  return value instanceof Slot || value instanceof Component || proxyToRawCache.has(value)
}

export function getObserver<T extends object>(v: T): T & Model | null {
  return rawToProxyCache.get(v) as T & Model || null
}

export function getChangeMarker<T extends object>(target: T): ChangeMarker | null {
  if (isModel(target)) {
    return target.__changeMarker__
  }
  if (target instanceof ChangeMarker) {
    return target
  }
  const observer = getObserver(target)
  if (observer) {
    return observer.__changeMarker__
  }
  return null
}

const attachErrorFn = makeError('attachError')

export function attachModel(parentModel: Model, subModel: unknown) {
  if (!isModel(subModel)) {
    return
  }
  const subCM = subModel.__changeMarker__ as ChangeMarker
  if (subCM.parentModel === parentModel) {
    return
  }
  if (subCM.parentModel !== null) {
    throw attachErrorFn('A data model cannot appear on two nodes.')
  }
  subCM.parentModel = parentModel
}

export function detachModel(...models: any[]) {
  models.forEach(item => {
    const changeMarker = getChangeMarker(item)
    if (changeMarker) {
      changeMarker.parentModel = null
      changeMarker.detach()
    }
  })
}
