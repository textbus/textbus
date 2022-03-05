import { Patch } from 'immer'
import { ComponentLiteral } from './component'
import { SlotLiteral } from './slot'

export interface InsertAction {
  type: 'insert'
  content: string | ComponentLiteral
  formats?: Record<string, any>
}

export interface RetainAction {
  type: 'retain'
  index: number
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
}

export interface InsertSlotAction {
  type: 'insertSlot'
  slot: SlotLiteral
}

export type Action = InsertAction | RetainAction | DeleteAction | ApplyAction | InsertSlotAction

export interface Operation {
  path: number[]
  apply: Action[]
  unApply: Action[]
}
