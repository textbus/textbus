import type { Slot, SlotLiteral } from './slot'
import type { AsyncSlot } from './async-runtime'
import type { AsyncSlotLiteral } from './async-literals'
import type { ComponentStateLiteral } from './component'

export type ToLiteral<T> = T extends AsyncSlot<infer A, infer B> ? AsyncSlotLiteral<A, B> :
  T extends Slot<infer C> ? SlotLiteral<C> :
    T extends [infer First, ...infer Rest] ? [ToLiteral<First>, ...Rest] :
      T extends Array<infer Item> ? Array<ToLiteral<Item>> :
        T extends Record<string, any> ? ComponentStateLiteral<T> : T
