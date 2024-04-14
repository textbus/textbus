import { Slot } from './slot'

/**
 * Textbus 管理组件内部插槽增删改查的类
 */
export class Slots extends Array<Slot>{
  /** 最后一个子插槽 */
  get last() {
    return this[this.length - 1] || null
  }

  /** 第一个子插槽 */
  get first() {
    return this[0] || null
  }

  get(index: number) {
    return this[index] || null
  }
}
