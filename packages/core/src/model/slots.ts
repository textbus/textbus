import { Observable, Subject, Subscription } from '@tanbo/stream'

import { Slot } from './slot'
import { ComponentInstance } from './component'
import { Action, Operation } from './types'

/**
 * Textbus 管理组件内部插槽增删改查的类
 */
export class Slots<T = any> {
  readonly onChildSlotRemove: Observable<Slot<T>[]>
  readonly onChange: Observable<Operation>
  readonly onChildSlotChange: Observable<Slot<T>>

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

  get index() {
    return this._index
  }

  private slots: Slot<T>[] = []
  private _index = 0
  private changeEvent = new Subject<Operation>()
  private childSlotChangeEvent = new Subject<Slot<T>>()
  private childSlotRemoveEvent = new Subject<Slot<T>[]>()

  private changeListeners = new WeakMap<Slot, Subscription>()

  constructor(public host: ComponentInstance,
              slots: Slot<T>[] = []) {
    this.onChange = this.changeEvent.asObservable()
    this.onChildSlotChange = this.childSlotChangeEvent.asObservable()
    this.onChildSlotRemove = this.childSlotRemoveEvent.asObservable()
    this.insert(...Array.from(new Set(slots)))
  }

  /**
   * 获取子插槽的下标位置
   * @param slot
   */
  indexOf(slot: Slot<T>) {
    return this.slots.indexOf(slot)
  }

  /**
   * 删除指定插槽
   * @param slot
   */
  remove(slot: Slot<T>) {
    const index = this.slots.indexOf(slot)
    if (index > -1) {
      this.retain(index)
      this.delete(1)
      return true
    }
    return false
  }

  /**
   * 把新插槽插入到指定插槽的后面
   * @param slots
   * @param ref
   */
  insertAfter(slots: Slot<T> | Slot<T>[], ref: Slot<T>) {
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
  insertBefore(slots: Slot<T> | Slot<T>[], ref: Slot<T>) {
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
  insertByIndex(slots: Slot<T> | Slot<T>[], index: number) {
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
  push(...slots: Slot<T>[]) {
    this.retain(this.length)
    this.insert(...slots)
  }

  /**
   * 删除最后一个插槽并返回
   */
  pop() {
    if (this.length > 0) {
      const last = this.last
      this.retain(this.length - 1)
      this.delete(1)
      return last
    }
    return null
  }

  /**
   * 删除第一个插槽并返回
   */
  shift() {
    if (this.length > 0) {
      const first = this.first
      this.retain(0)
      this.delete(1)
      return first
    }
    return null
  }

  /**
   * 把新插槽添加到最前
   * @param slots
   */
  unshift(...slots: Slot<T>[]) {
    this.retain(0)
    this.insert(...slots)
  }

  /**
   * 获取指定下标位置的插槽
   * @param index
   */
  get(index: number): Slot<T> | null {
    return this.slots[index] || null
  }

  /**
   * 替换插槽
   * @param oldSlot 被替换的插槽
   * @param newSlot 新的插槽
   */
  replace(oldSlot: Slot<T>, newSlot: Slot<T>) {
    const index = this.indexOf(oldSlot)
    if (index > 0) {
      this.retain(index)
      this.delete(1)
      this.insert(newSlot)
    }
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
  toArray(): Slot<T>[] {
    return [...this.slots]
  }

  /**
   * 清空子插槽
   */
  clean() {
    this.retain(0)
    this.delete(this.length)
  }

  /**
   * 插入新的子插槽
   * @param slots
   */
  insert(...slots: Slot<T>[]) {
    if (slots.length === 0) {
      return
    }
    const index = this._index
    this.slots.splice(index, 0, ...slots)

    slots.forEach(i => {
      if (i.parent) {
        i.parent.slots.remove(i)
      }
      i.changeMarker.reset()
      i.parent = this.host
      const sub = i.changeMarker.onChange.subscribe(operation => {
        operation.path.unshift(this.indexOf(i))
        if (i.changeMarker.dirty) {
          this.host.changeMarker.markAsDirtied(operation)
        } else {
          this.host.changeMarker.markAsChanged(operation)
        }
        this.childSlotChangeEvent.next(i)
      })
      sub.add(i.changeMarker.onChildComponentRemoved.subscribe(instance => {
        this.host.changeMarker.recordComponentRemoved(instance)
      }))
      sub.add(i.changeMarker.onForceChange.subscribe(() => {
        if (i.changeMarker.dirty) {
          this.host.changeMarker.forceMarkDirtied()
        } else {
          this.host.changeMarker.forceMarkChanged()
        }
      }))
      this.changeListeners.set(i, sub)
    })

    this._index += slots.length
    this.changeEvent.next({
      path: [],
      apply: [{
        type: 'retain',
        offset: index
      }, ...slots.map<Action>(i => {
        return {
          type: 'insertSlot',
          slot: i.toJSON(),
          ref: i,
        }
      })],
      unApply: [{
        type: 'retain',
        offset: index
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
      this._index = 0
    } else if (index > this.length) {
      this._index = this.length
    } else {
      this._index = index
    }
  }

  /**
   * 从下标位置向后删除指定数量的子插槽
   * @param count
   */
  delete(count: number) {
    const startIndex = this._index
    const deletedSlots = this.slots.splice(startIndex, count)

    deletedSlots.forEach(i => {
      i.sliceContent().forEach(content => {
        if (typeof content !== 'string') {
          this.host.changeMarker.recordComponentRemoved(content)
        }
      })
      this.changeListeners.get(i)?.unsubscribe()
      this.changeListeners.delete(i)
    })

    this.changeEvent.next({
      path: [],
      apply: [{
        type: 'retain',
        offset: startIndex
      }, {
        type: 'delete',
        count
      }],
      unApply: deletedSlots.map<Action[]>((slot, i) => {
        slot.parent = null
        return [{
          type: 'retain',
          offset: startIndex + i
        }, {
          type: 'insertSlot',
          slot: slot.toJSON(),
          ref: slot
        }]
      }).flat()
    })
    this.childSlotRemoveEvent.next(deletedSlots)
  }

  /**
   * 剪切子插槽
   * @param startIndex
   * @param endIndex
   */
  cut(startIndex = 0, endIndex = this.length) {
    if (startIndex >= endIndex) {
      return []
    }
    const deletedSlots = this.slots.slice(startIndex, endIndex)
    this.retain(startIndex)
    this.delete(endIndex - startIndex)
    return deletedSlots
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
  has(slot: Slot<T>) {
    return this.indexOf(slot) > -1
  }

  toString() {
    return this.slots.map(i => {
      return i.toString()
    }).join('')
  }
}
