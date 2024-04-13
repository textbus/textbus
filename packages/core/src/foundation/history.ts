/* eslint-disable */
import { Inject, Injectable } from '@viewfly/core'
import { map, Observable, Subject, Subscription } from '@tanbo/stream'
import { applyPatches } from 'immer'

import { ComponentLiteral, Formats, Operation } from '../model/_api'
import { Selection, SelectionPaths } from './selection'
import { Registry } from './registry'
import { HISTORY_STACK_SIZE } from './_injection-tokens'
import { ChangeOrigin, Scheduler } from './scheduler'
import { makeError } from '../_utils/make-error'

/**
 * 每一次变更所产生的记录
 */
export interface HistoryItem {
  /** 变更之前的光标位置 */
  beforePaths: SelectionPaths
  /** 变更之后的光标位置 */
  afterPaths: SelectionPaths
  /** 变更操作记录集合 */
  operations: Operation[]
}

/**
 * 历史记录抽象类，实现以下接口即可完成 Textbus 历史记录
 */
export abstract class History {
  abstract onChange: Observable<void>
  abstract onBack: Observable<void>
  abstract onForward: Observable<void>
  abstract onPush: Observable<void>
  abstract canBack: boolean
  abstract canForward: boolean

  abstract listen(): void

  abstract back(): void

  abstract forward(): void

  abstract clear(): void

  abstract destroy(): void
}

function objToFormats(formatsObj: Record<string, any>, registry: Registry): Formats {
  const formats: Formats = []
  Object.keys(formatsObj).forEach(i => {
    const formatter = registry.getFormatter(i)
    if (formatter) {
      const value = formatsObj[i]
      if (Array.isArray(value)) {
        value.forEach(item => {
          formats.push([formatter, item])
        })
      } else {
        formats.push([formatter, formatsObj[i]])
      }
    }
  })
  return formats
}

const historyErrorFn = makeError('History')

/**
 * Textbus 历史记录管理类
 */
@Injectable()
export class LocalHistory extends History {
  /**
   * 当历史记录变化时触发
   */
  onChange: Observable<void>
  /**
   * 当历史记录回退时触发
   */
  onBack: Observable<void>
  /**
   * 当历史记录重做时触发
   */
  onForward: Observable<void>
  /**
   * 当历史记录增加时触发
   */
  onPush: Observable<void>

  /**
   * 历史记录是否可回退
   */
  get canBack() {
    return this.historySequence.length > 0 && this.index > 0
  }

  /**
   * 历史记录是否可重做
   */
  get canForward() {
    return this.historySequence.length > 0 && this.index < this.historySequence.length
  }

  private index = 0
  private historySequence: HistoryItem[] = []

  private changeEvent = new Subject<void>()
  private backEvent = new Subject<void>()
  private forwardEvent = new Subject<void>()
  private pushEvent = new Subject<void>()

  private subscription: Subscription | null = null
  private forceChangeSubscription: Subscription | null = null

  constructor(@Inject(HISTORY_STACK_SIZE) private stackSize: number,
              private scheduler: Scheduler,
              private selection: Selection,
              private registry: Registry) {
    super()
    this.onChange = this.changeEvent.asObservable()
    this.onBack = this.backEvent.asObservable()
    this.onForward = this.forwardEvent.asObservable()
    this.onPush = this.pushEvent.asObservable()
  }

  /**
   * 监听数据变化，并记录操作历史
   */
  override listen() {
    this.record()
  }

  /**
   * 重做历史记录
   */
  override forward() {
    if (this.canForward) {
      this.scheduler.historyApplyTransact(() => {
        const item = this.historySequence[this.index]
        this.apply(item, false)
        this.selection.usePaths(item.afterPaths)
      })
      this.index++
      this.forwardEvent.next()
      this.changeEvent.next()
    }
  }

  /**
   * 撤消操作
   */
  override back() {
    if (this.canBack) {
      this.scheduler.historyApplyTransact(() => {
        const item = this.historySequence[this.index - 1]
        this.apply(item, true)
        this.selection.usePaths(item.beforePaths)
      })
      this.index--
      this.backEvent.next()
      this.changeEvent.next()
    }
  }

  /**
   * 清除历史记录
   */
  override clear() {
    this.historySequence = []
    this.index = 0
    this.changeEvent.next()
  }

  /**
   * 销毁历史记录实例
   */
  override destroy() {
    this.historySequence = []
    this.forceChangeSubscription?.unsubscribe()
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }

  private record() {
    // let beforePaths = this.selection.getPaths()
    // this.subscription = this.scheduler.onLocalChangeBefore.subscribe(() => {
    //   beforePaths = this.selection.getPaths()
    // }).add(this.scheduler.onDocChanged.pipe(map(i => {
    //     const operations: Operation[] = []
    //     for (const item of i) {
    //       if (item.from !== ChangeOrigin.Local) {
    //         continue
    //       }
    //       const operation = item.operation
    //       const apply = operation.apply.filter(i => {
    //         return i.type !== 'apply' || i.record
    //       })
    //       const unApply = operation.unApply.filter(i => {
    //         return i.type !== 'apply' || i.record
    //       })
    //       if (apply.length && unApply.length) {
    //
    //         operations.push({
    //           path: operation.path,
    //           apply,
    //           unApply
    //         })
    //       }
    //     }
    //     return operations
    //   })).subscribe((operations) => {
    //     if (!operations.length) {
    //       return
    //     }
    //     this.historySequence.length = this.index
    //     this.index++
    //     const afterPaths = this.selection.getPaths()
    //     this.historySequence.push({
    //       operations: operations.map(i => {
    //         return {
    //           path: [...i.path],
    //           apply: i.apply.map(j => {
    //             if (j.type === 'insert' || j.type === 'insertSlot') {
    //               return {
    //                 ...j,
    //                 ref: null
    //               } as any
    //             }
    //             return j
    //           }),
    //           unApply: i.unApply.map(j => {
    //             if (j.type === 'insert' || j.type === 'insertSlot') {
    //               return {
    //                 ...j,
    //                 ref: null
    //               } as any
    //             }
    //             return j
    //           })
    //         }
    //       }),
    //       beforePaths,
    //       afterPaths
    //     })
    //     if (this.historySequence.length > this.stackSize) {
    //       this.historySequence.shift()
    //       this.index--
    //     }
    //     beforePaths = afterPaths
    //     this.pushEvent.next()
    //     this.changeEvent.next()
    //   })
    // )
  }

  private apply(historyItem: HistoryItem, back: boolean) {
    // let operations = historyItem.operations
    // if (back) {
    //   operations = [...operations].reverse()
    // }
    // operations.forEach(op => {
    //   const path = [...op.path]
    //   const isFindSlot = path.length % 2 === 1
    //   const actions = back ? op.unApply : op.apply
    //
    //   if (isFindSlot) {
    //     const slot = this.selection.findSlotByPaths(path)!
    //     actions.forEach(action => {
    //       if (action.type === 'retain') {
    //         const formatsObj = action.formats
    //         if (formatsObj) {
    //           const formats = objToFormats(formatsObj, this.registry)
    //           slot.retain(action.offset, formats)
    //         } else {
    //           slot.retain(action.offset)
    //         }
    //         return
    //       }
    //       if (action.type === 'delete') {
    //         slot.delete(action.count)
    //         return
    //       }
    //       if (action.type === 'apply') {
    //         slot.updateState(draft => {
    //           applyPatches(draft, action.patches)
    //         })
    //         return
    //       }
    //       if (action.type === 'attrSet') {
    //         const attribute = this.registry.getAttribute(action.name)
    //         if (attribute) {
    //           slot.setAttribute(attribute, action.value)
    //         }
    //         return
    //       }
    //       if (action.type === 'attrRemove') {
    //         const attribute = this.registry.getAttribute(action.name)
    //         if (attribute) {
    //           slot.removeAttribute(attribute)
    //         }
    //         return
    //       }
    //       if (action.type === 'insert') {
    //         const formatsObj = action.formats
    //         let formats: Formats | void
    //         if (formatsObj) {
    //           formats = objToFormats(formatsObj, this.registry)
    //         }
    //         if (typeof action.content === 'string') {
    //           formats ? slot.insert(action.content, formats) : slot.insert(action.content)
    //         } else {
    //           const instance = this.registry.createComponent(action.content as ComponentLiteral)
    //           if (!instance) {
    //             // eslint-disable-next-line max-len
    //             throw historyErrorFn(`component \`${action.content.name}\` not registered, please add \`${action.content.name}\` component to the components configuration item.`)
    //           }
    //           formats ? slot.insert(instance, formats) : slot.insert(instance)
    //         }
    //       }
    //     })
    //   } else {
    //     const component = this.selection.findComponentByPaths(path)!
    //     actions.forEach(action => {
    //       if (action.type === 'retain') {
    //         component.slots.retain(action.offset)
    //         return
    //       }
    //       if (action.type === 'delete') {
    //         component.slots.delete(action.count)
    //         return
    //       }
    //       if (action.type === 'insertSlot') {
    //         const slot = this.registry.createSlot(action.slot)
    //         component.slots.insert(slot)
    //         return
    //       }
    //       if (action.type === 'apply') {
    //         component.updateState(draft => {
    //           return applyPatches(draft as any, action.patches)
    //         })
    //       }
    //     })
    //   }
    // })
  }
}
