import { Patch } from 'immer'
import { ComponentInstance, ComponentLiteral } from './component'
import { Slot, SlotLiteral } from './slot'

export interface InsertAction {
  type: 'insert'
  content: string | ComponentLiteral
  ref: string | ComponentInstance
  formats?: Record<string, any>
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

export interface ApplyAction {
  type: 'apply'
  patches: Patch[],
  value: any
  record: boolean
}

export interface InsertSlotAction {
  type: 'insertSlot'
  slot: SlotLiteral
  ref: Slot
}

export type Action = InsertAction | RetainAction | DeleteAction | ApplyAction | InsertSlotAction

export interface Operation {
  path: number[]
  apply: Action[]
  unApply: Action[]
}
