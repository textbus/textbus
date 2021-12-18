import { Observable, Subject, Subscription } from '@tanbo/stream'

import { Slot, SlotLiteral } from './slot'
import { Action, Operation } from './operation'
import { ComponentInstance } from './component'

export interface SlotChangeData<T extends Slot> {
  source: T
  operation: Operation
}

export interface SlotRestore<T extends Slot, State extends SlotLiteral> {
  (state: State): T
}

export class Slots<SlotState extends SlotLiteral = SlotLiteral, T extends Slot = Slot> {
  readonly onChange: Observable<Operation>
  readonly onChildSlotChange: Observable<SlotChangeData<T>>
  readonly onChildComponentRemoved: Observable<ComponentInstance>

  get length() {
    return this.slots.length
  }

  get last() {
    return this.slots[this.length - 1] || null
  }

  get first() {
    return this.slots[0] || null
  }

  private slots: T[] = []
  private index = 0
  private changeEvent = new Subject<Operation>()
  private childSlotChangeEvent = new Subject<SlotChangeData<T>>()
  private childComponentRemovedEvent = new Subject<ComponentInstance>()

  private changeListeners = new WeakMap<T, Subscription>()

  constructor(public host: ComponentInstance,
              public slotRestore: SlotRestore<T, SlotState>,
              slots: T[] = []) {
    this.onChange = this.changeEvent.asObservable()
    this.onChildSlotChange = this.childSlotChangeEvent.asObservable()
    this.onChildComponentRemoved = this.childComponentRemovedEvent.asObservable()
    this.insert(...slots)
  }

  indexOf(slot: T) {
    return this.slots.indexOf(slot)
  }

  remove(slot: T) {
    const index = this.slots.indexOf(slot)
    if (index > -1) {
      this.retain(index + 1)
      this.delete(1)
    }
  }

  insertAfter(slots: T | T[], ref: T) {
    const index = this.slots.indexOf(ref)
    if (index > -1) {
      this.insertByIndex(slots, index + 1)
    }
  }

  insertBefore(slots: T | T[], ref: T) {
    const index = this.slots.indexOf(ref)
    if (index > -1) {
      this.insertByIndex(slots, index)
    }
  }

  insertByIndex(slots: T | T[], index: number) {
    if (index < 0) {
      index = 0
    }
    if (index > this.slots.length) {
      index = this.slots.length
    }
    this.retain(index)
    const s = Array.isArray(slots) ? slots : [slots]
    this.insert(...s)
  }

  push(...slots: T[]) {
    this.insert(...slots)
  }

  get(index: number): T | null {
    return this.slots[index] || null
  }

  toJSON() {
    return this.slots.map(i => i.toJSON())
  }

  toArray(): T[] {
    return [...this.slots]
  }

  clear() {
    this.retain(this.length)
    this.delete(this.length)
  }

  insert(...slots: T[]) {
    if (slots.length === 0) {
      return
    }
    const index = this.index
    this.slots.splice(index, 0, ...slots)

    slots.forEach(i => {
      if (i.parent) {
        i.parent.slots.remove(i)
      }
      i.changeMarker.reset()
      i.parent = this.host
      const sub = i.changeMarker.onChange.subscribe(operation => {
        operation.path.unshift(this.indexOf(i))
        this.childSlotChangeEvent.next({
          source: i,
          operation
        })
      })
      sub.add(i.changeMarker.onChildComponentRemoved.subscribe(instance => {
        this.childComponentRemovedEvent.next(instance)
      }))
      this.changeListeners.set(i, sub)
    })

    this.index += slots.length
    this.changeEvent.next({
      path: [],
      apply: [{
        type: 'retain',
        index
      }, ...slots.map<Action>(i => {
        return {
          type: 'insertSlot',
          slot: i.toJSON()
        }
      })],
      unApply: [{
        type: 'retain',
        index: index + slots.length
      }, {
        type: 'delete',
        count: slots.length
      }]
    })
  }

  retain(index: number) {
    this.index = index
  }

  delete(count: number) {
    const startIndex = this.index - count
    const endIndex = this.index
    const deletedSlots = this.slots.slice(startIndex, endIndex)

    deletedSlots.forEach(i => {
      this.changeListeners.get(i)?.unsubscribe()
      this.changeListeners.delete(i)
    })

    this.slots.splice(startIndex, count)
    this.index -= count
    this.changeEvent.next({
      path: [],
      apply: [{
        type: 'retain',
        index: endIndex
      }, {
        type: 'delete',
        count
      }],
      unApply: deletedSlots.map<Action[]>((slot, i) => {
        slot.parent = null
        return [{
          type: 'retain',
          index: startIndex + i
        }, {
          type: 'insertSlot',
          slot: slot.toJSON()
        }]
      }).flat()
    })
  }

  slice(startIndex?: number, endIndex?: number) {
    return this.slots.slice(startIndex, endIndex)
  }

  has(slot: T) {
    return this.indexOf(slot) > -1
  }
}
