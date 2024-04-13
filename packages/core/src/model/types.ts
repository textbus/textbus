import { Component, ComponentLiteral } from './component'
import { Slot, SlotLiteral } from './slot'

export interface InsertAction {
  type: 'insert'
  data: any
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

export interface SlotInsertAction {
  type: 'insertSlot'
  slot: SlotLiteral<any>
  ref: Slot
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
  SlotInsertAction |
  ContentInsertAction |
  PropDeleteAction |
  PropSetAction |
  AttrDeleteAction |
  AttrSetAction

export interface Operation {
  path: Array<number>
  apply: Action[]
  unApply: Action[]
}

export interface State extends Record<string, any> {

}

//
// export interface StateChange<T> {
//   oldState: T
//   newState: T
//   record: boolean
// }

