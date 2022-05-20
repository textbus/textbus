import { Injectable } from '@tanbo/di'
import { Observable, Subject, Subscription } from '@tanbo/stream'
import { applyPatches } from 'immer'

import { ComponentLiteral, Formats, Operation } from '../model/_api'
import { Translator } from './translator'
import { SelectionPaths, Selection } from './selection'
import { Registry } from './registry'
import { RootComponentRef } from './_injection-tokens'
import { Scheduler } from './scheduler'

export interface HistoryItem {
  beforePaths: SelectionPaths
  afterPaths: SelectionPaths
  operations: Operation[]
}

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

  abstract destroy(): void
}

/**
 * Textbus 历史记录管理类
 */
@Injectable()
export class CoreHistory extends History {
  /**
   * 当历史记录变化时触发
   */
  onChange: Observable<void>

  onBack: Observable<void>
  onForward: Observable<void>
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

  constructor(private root: RootComponentRef,
              private scheduler: Scheduler,
              private selection: Selection,
              private translator: Translator,
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
  listen() {
    this.record()
  }

  /**
   * 重做历史记录
   */
  forward() {
    if (this.canForward) {
      this.scheduler.ignoreChanges = true
      const item = this.historySequence[this.index]
      this.apply(item, false)
      this.selection.usePaths(item.afterPaths)
      this.scheduler.ignoreChanges = false
      this.index++
      this.forwardEvent.next()
      this.changeEvent.next()
    }
  }

  /**
   * 撤消操作
   */
  back() {
    if (this.canBack) {
      this.scheduler.ignoreChanges = true
      const item = this.historySequence[this.index - 1]
      this.apply(item, true)
      this.selection.usePaths(item.beforePaths)
      this.scheduler.ignoreChanges = false
      this.index--
      this.record()
      this.backEvent.next()
      this.changeEvent.next()
    }
  }

  /**
   * 销毁历史记录实例
   */
  destroy() {
    this.historySequence = []
    this.forceChangeSubscription?.unsubscribe()
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }

  private record() {
    let beforePaths = this.selection.getPaths()
    this.scheduler.onDocChange.subscribe((operations) => {
      this.historySequence.length = this.index
      this.index++
      const afterPaths = this.selection.getPaths()
      this.historySequence.push({
        operations,
        beforePaths,
        afterPaths
      })
      beforePaths = afterPaths
      this.pushEvent.next()
      this.changeEvent.next()
    })
  }

  private apply(historyItem: HistoryItem, back: boolean) {
    let operations = historyItem.operations
    if (back) {
      operations = [...operations].reverse()
    }
    operations.forEach(op => {
      const path = [...op.path]
      const isFindSlot = path.length % 2 === 1
      const actions = back ? op.unApply : op.apply

      if (isFindSlot) {
        const slot = this.selection.findSlotByPaths(path)!
        actions.forEach(action => {
          if (action.type === 'retain') {
            if (action.formats) {
              const formats: Formats = []
              Object.keys(action.formats).forEach(i => {
                const formatter = this.registry.getFormatter(i)
                if (formatter) {
                  formats.push([formatter, action.formats![i]])
                }
              })
              slot.retain(action.offset, formats)
            } else {
              slot.retain(action.offset)
            }
            return
          }
          if (action.type === 'delete') {
            slot.delete(action.count)
            return
          }
          if (action.type === 'apply') {
            slot.updateState(draft => {
              applyPatches(draft, action.patches)
            })
            return
          }
          if (action.type === 'insert') {
            if (typeof action.content === 'string') {
              if (action.formats) {
                const formats: Formats = []
                Object.keys(action.formats).forEach(i => {
                  const formatter = this.registry.getFormatter(i)
                  if (formatter) {
                    formats.push([formatter, action.formats![i]])
                  }
                })
                slot.insert(action.content, formats)
              } else {
                slot.insert(action.content)
              }
            } else {
              const component = this.translator.createComponent(action.content as ComponentLiteral)!
              slot.insert(component)
            }
          }
        })
      } else {
        const component = this.selection.findComponentByPaths(path)!
        actions.forEach(action => {
          if (action.type === 'retain') {
            component.slots.retain(action.offset)
            return
          }
          if (action.type === 'delete') {
            component.slots.delete(action.count)
            return
          }
          if (action.type === 'insertSlot') {
            const slot = this.translator.createSlot(action.slot)
            component.slots.insert(slot)
          }
          if (action.type === 'apply') {
            component.updateState(draft => {
              return applyPatches(draft, action.patches)
            })
            return
          }
        })
      }
    })
  }
}
