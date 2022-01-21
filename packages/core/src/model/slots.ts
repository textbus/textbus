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

/**
 * TextBus 管理组件内部插槽增删改查的类
 */
export class Slots<SlotState extends SlotLiteral = SlotLiteral, T extends Slot = Slot> {
  readonly onChange: Observable<Operation>
  readonly onChildSlotChange: Observable<SlotChangeData<T>>
  readonly onChildComponentRemoved: Observable<ComponentInstance>

  /** 子插槽的个数 */
  get length() {
    return this.slots.length
  }

  /** 最后一个子插槽 */
  get last() {
    return this.slots[this.length - 1] || null
  }

  /** 第一个子插槽 */
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

  /**
   * 获取子插槽的下标位置
   * @param slot
   */
  indexOf(slot: T) {
    return this.slots.indexOf(slot)
  }

  /**
   * 删除指定插槽
   * @param slot
   */
  remove(slot: T) {
    const index = this.slots.indexOf(slot)
    if (index > -1) {
      this.retain(index + 1)
      this.delete(1)
    }
  }

  /**
   * 把新插槽插入到指定插槽的后面
   * @param slots
   * @param ref
   */
  insertAfter(slots: T | T[], ref: T) {
    const index = this.slots.indexOf(ref)
    if (index > -1) {
      this.insertByIndex(slots, index + 1)
    }
  }

  /**
   * 把新插槽插入到指定插槽的前面
   * @param slots
   * @param ref
   */
  insertBefore(slots: T | T[], ref: T) {
    const index = this.slots.indexOf(ref)
    if (index > -1) {
      this.insertByIndex(slots, index)
    }
  }

  /**
   * 把新插槽插入到指定下标位置
   * @param slots
   * @param index
   */
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

  /**
   * 把新插槽添加到最后
   * @param slots
   */
  push(...slots: T[]) {
    this.retain(this.length)
    this.insert(...slots)
  }

  /**
   * 把新插槽添加到最前
   * @param slots
   */
  unshift(...slots: T[]) {
    this.retain(0)
    this.insert(...slots)
  }

  /**
   * 获取指定下标位置的插槽
   * @param index
   */
  get(index: number): T | null {
    return this.slots[index] || null
  }

  /**
   * 把所有子插槽转换为 JSON
   */
  toJSON() {
    return this.slots.map(i => i.toJSON())
  }

  /**
   * 把当前插槽集合转换为数组
   */
  toArray(): T[] {
    return [...this.slots]
  }

  /**
   * 清空子插槽
   */
  clean() {
    this.retain(this.length)
    this.delete(this.length)
  }

  /**
   * 插入新的子插槽
   * @param slots
   */
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

  /**
   * 设置新的下标
   * @param index
   */
  retain(index: number) {
    if (index < 0) {
      this.index = 0
    } else if (index > this.length) {
      this.index = this.length
    } else {
      this.index = index
    }
  }

  /**
   * 从下标位置向前删除指定数量的子插槽
   * @param count
   */
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

  /**
   * 根据范围切分出一组子插槽
   * @param startIndex
   * @param endIndex
   */
  slice(startIndex?: number, endIndex?: number) {
    return this.slots.slice(startIndex, endIndex)
  }

  /**
   * 当前集合是否包含指定插槽
   * @param slot
   */
  has(slot: T) {
    return this.indexOf(slot) > -1
  }
}
