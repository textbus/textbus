// eslint-disable
import { Inject, Injectable } from '@viewfly/core'
import { map, Observable, Subject, Subscription } from '@tanbo/stream'

import { Component, ComponentLiteral, Formats, Operation, Paths, Slot } from '../model/_api'
import { Selection } from './selection'
import { Registry } from './registry'
import { HISTORY_STACK_SIZE, RootComponentRef } from './_injection-tokens'
import { ChangeOrigin, Scheduler } from './scheduler'
import { makeError } from '../_utils/make-error'

interface SelectionPaths {
  anchor: Paths
  focus: Paths
}

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
              private rootComponentRef: RootComponentRef,
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
        this.usePaths(item.afterPaths)
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
        this.usePaths(item.beforePaths)
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
    let beforePaths = this.getPaths()
    this.subscription = this.scheduler.onLocalChangeBefore.subscribe(() => {
      beforePaths = this.getPaths()
    }).add(this.scheduler.onDocChanged.pipe(map(changeItem => {
        const operations: Operation[] = []
        for (const item of changeItem) {
          if (item.from !== ChangeOrigin.Local) {
            continue
          }
          const { apply, unApply, paths } = item.operation;
          [...apply, ...unApply].forEach(i => {
            if (i.type === 'insert' || i.type === 'propSet') {
              i.ref = null
            }
          })
          if (apply.length && unApply.length) {
            operations.push({
              paths,
              apply,
              unApply
            })
          }
        }
        return operations
      })).subscribe((operations) => {
        if (!operations.length) {
          return
        }
        this.historySequence.length = this.index
        this.index++
        const afterPaths = this.getPaths()
        this.historySequence.push({
          operations,
          beforePaths,
          afterPaths
        })
        if (this.historySequence.length > this.stackSize) {
          this.historySequence.shift()
          this.index--
        }
        beforePaths = afterPaths
        this.pushEvent.next()
        this.changeEvent.next()
      })
    )
  }

  private apply(historyItem: HistoryItem, back: boolean) {
    // let operations = historyItem.operations
    // if (back) {
    //   operations = [...operations].reverse()
    // }
    // operations.forEach(op => {
    //   const paths = [...op.paths]
    //   const actions = back ? op.unApply : op.apply
    //   const currentModel = this.findModelByPaths(paths)
    //   if (!currentModel) {
    //     throw historyErrorFn(`the model for path \`${paths.join('/')}\` cannot be found in the document.`)
    //   }
    //
    //   let model: any = currentModel
    //   if (model instanceof Component) {
    //     model = model.state
    //   }
    //   actions.forEach(action => {
    //     switch (action.type) {
    //       case 'retain': {
    //         const formatsObj = action.formats
    //         if (formatsObj) {
    //           const formats = objToFormats(formatsObj, this.registry)
    //           model.retain(action.offset, formats)
    //         } else {
    //           model.retain(action.offset)
    //         }
    //       }
    //         break
    //       case 'attrDelete':
    //         model.removeAttribute(action.name)
    //         break
    //       case 'attrSet':
    //         model.setAttribute(action.name, action.value)
    //         break
    //       case 'insert':
    //         if (action.isSlot) {
    //           // const slot = this.registry.createSlot(action.data)
    //           // model.insert(slot)
    //         } else {
    //           model.insert(action.data)
    //         }
    //         break
    //       case 'contentInsert': {
    //         const formatsObj = action.formats
    //         let formats: Formats | null = null
    //         if (formatsObj) {
    //           formats = objToFormats(formatsObj, this.registry)
    //         }
    //         if (typeof action.content === 'string') {
    //           formats ? model.insert(action.content, formats) : model.insert(action.content)
    //         } else {
    //           const instance = this.registry.createComponent(action.content as ComponentLiteral)
    //           if (!instance) {
    //             // eslint-disable-next-line max-len
    //             throw historyErrorFn(`component \`${action.content.name}\` not registered, please add \`${action.content.name}\` component to the components configuration item.`)
    //           }
    //           formats ? model.insert(instance, formats) : model.insert(instance)
    //         }
    //       }
    //         break
    //       case 'delete':
    //         model.delete(action.count)
    //         break
    //       case 'propDelete':
    //         model.remove(action.key)
    //         break
    //       case 'propSet':
    //         if (action.isSlot) {
    //           const slot = this.registry.createSlot(action.value)
    //           model.set(action.key, slot)
    //         } else {
    //           model.set(action.key, action.value)
    //         }
    //         break
    //     }
    //   })
    // })
  }

  private getPaths(): SelectionPaths {
    let anchor: Paths = []
    let focus: Paths = []
    if (this.selection.isSelected) {
      anchor = this.selection.anchorSlot!.changeMarker.triggerPath([this.selection.anchorOffset!])
      focus = this.selection.focusSlot!.changeMarker.triggerPath([this.selection.focusOffset!])
    }
    return {
      anchor,
      focus
    }
  }

  private usePaths(paths: SelectionPaths) {
    // const anchorOffset = paths.anchor.pop()
    // const focusOffset = paths.focus.pop()
    // const anchorSlot = this.findModelByPaths(paths.anchor)
    // const focusSlot = this.findModelByPaths(paths.focus)
    //
    // if (typeof anchorOffset === 'number' && typeof focusOffset === 'number' && anchorSlot instanceof Slot && focusSlot instanceof Slot) {
    //   this.selection.setBaseAndExtent(anchorSlot, anchorOffset, focusSlot, focusOffset)
    // }
  }

  private findModelByPaths(paths: Paths) {
  //   if (paths.length === 0) {
  //     return null
  //   }
  //   let currentModel: Component | Slot | MapModel<any> | ArrayModel<any> = this.rootComponentRef.component
  //   paths = [...paths]
  //   while (paths.length) {
  //     const path = paths.shift()
  //     if (currentModel instanceof Component) {
  //       currentModel = currentModel.state.get(path as string)
  //       continue
  //     }
  //     if (currentModel instanceof Slot) {
  //       currentModel = currentModel.getContentAtIndex(path as number) as Component
  //       continue
  //     }
  //     if (currentModel instanceof MapModel) {
  //       currentModel = currentModel.get(path as string)
  //       continue
  //     }
  //     if (currentModel instanceof ArrayModel) {
  //       currentModel = currentModel.get(path as number)
  //       continue
  //     }
  //     throw historyErrorFn(`cannot find path ${path}`)
  //   }
  //   return currentModel || null
  }
}
