import { Component, ComponentLiteral } from './component'
import { Slot } from './slot'
import { MapModel } from './map-model'
import { ArrayModel } from './array-model'

export interface InsertAction {
  type: 'insert'
  data: any
  ref: any
  isSlot: boolean
}

export interface RetainAction {
  type: 'retain'
  offset: number
  formats?: Record<string, any>
}

export interface DeleteAction {
  type: 'delete'
  count: number
}

export interface PropDeleteAction {
  type: 'propDelete'
  key: string
}

export interface PropSetAction {
  type: 'propSet'
  key: string
  value: any
  ref: any
  isSlot: boolean
}

export interface AttrDeleteAction {
  type: 'attrDelete'
  name: string
}

export interface AttrSetAction {
  type: 'attrSet'
  name: string
  value: any
}

export interface ContentInsertAction {
  type: 'contentInsert'
  content: string | ComponentLiteral
  ref: string | Component
  formats?: Record<string, any>
}

export type Action = InsertAction |
  RetainAction |
  DeleteAction |
  ContentInsertAction |
  PropDeleteAction |
  PropSetAction |
  AttrDeleteAction |
  AttrSetAction

export interface Operation {
  paths: Array<number|string>
  apply: Action[]
  unApply: Action[]
}

export interface State {
  [key: string]: any
}

//
// export interface StateChange<T> {
//   oldState: T
//   newState: T
//   record: boolean
// }
export type SharedConstant = boolean | string | number

export type SharedArray<T extends SharedConstant | SharedMap<T> | SharedArray<T>> = Array<T>

export type SharedMap<T extends SharedConstant | SharedArray<T> | SharedMap<T>> = Record<string, T>

export type SharedType<T extends SharedArray<T> | SharedMap<T>> = SharedConstant | SharedArray<T> | SharedMap<T>

export type ExtractDeltaType<T> =
  T extends SharedType<infer K>
    ? K extends SharedArray<infer Item>
      ? ArrayModel<Item>
      : K extends SharedMap<any>
        ? MapModel<K>
        : never
    : never

export type TransferValueType<T> =
  T extends Slot ? T :
    T extends Array<infer Item> ?
      (Item extends SharedType<any> ?
        ArrayModel<Item> : never) :
      T extends Record<string, any> ? MapModel<T> : T

export type DestroyCallbacks = Array<() => void>
