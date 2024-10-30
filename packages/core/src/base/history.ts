import { Inject, Injectable } from '@viewfly/core'
import { map, Observable, Subject, Subscription } from '@tanbo/stream'

import { AsyncSlotJSON, Component, ComponentLiteral, Formats, Operation, Paths, Slot, SlotJSON } from '../model/_api'
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
    let operations = historyItem.operations
    if (back) {
      operations = [...operations].reverse()
    }
    operations.forEach(op => {
      const paths = [...op.paths]
      const actions = back ? op.unApply : op.apply
      const currentModel = this.findModelByPaths(paths)
      if (!currentModel) {
        throw historyErrorFn(`the model for path \`${paths.join('/')}\` cannot be found in the document.`)
      }

      let model: any = currentModel
      if (model instanceof Component) {
        model = model.state
      }
      let index = 0
      actions.forEach(action => {
        switch (action.type) {
          case 'retain': {
            index = action.offset
            if (model instanceof Slot) {
              const formatsObj = action.formats
              if (formatsObj) {
                const formats = objToFormats(formatsObj, this.registry)
                model.retain(action.offset, formats)
              } else {
                model.retain(action.offset)
              }
            }
          }
            break
          case 'attrDelete': {
            const attr = this.registry.getAttribute(action.name)
            if (attr) {
              model.removeAttribute(attr)
            }
          }
            break
          case 'attrSet': {
            const attr = this.registry.getAttribute(action.name)
            if (attr) {
              model.setAttribute(attr, action.value)
            }
          }
            break
          case 'insert': {
            const data = this.valueToModel(action.data)
            model.splice(index, 0, ...data)
          }
            break
          case 'contentInsert': {
            const formatsObj = action.formats
            let formats: Formats | null = null
            if (formatsObj) {
              formats = objToFormats(formatsObj, this.registry)
            }
            if (typeof action.content === 'string') {
              formats ? model.insert(action.content, formats) : model.insert(action.content)
            } else {
              const instance = this.registry.createComponent(action.content as ComponentLiteral)
              if (!instance) {
                // eslint-disable-next-line max-len
                throw historyErrorFn(`component \`${action.content.name}\` not registered, please add \`${action.content.name}\` component to the components configuration item.`)
              }
              formats ? model.insert(instance, formats) : model.insert(instance)
            }
          }
            break
          case 'delete':
            if (model instanceof Slot) {
              model.delete(action.count)
            } else {
              model.splice(index, action.count)
            }
            break
          case 'propDelete':
            Reflect.deleteProperty(model, action.key)
            break
          case 'propSet': {
            model[action.key] = this.valueToModel(action.value)
          }
            break
          case 'setIndex':
            model[action.index] = this.valueToModel(action.value)
            if (model.length !== action.afterLength) {
              model.length = action.afterLength
            }
            break
        }
      })
    })
  }

  private valueToModel(value: any): any {
    if (Array.isArray(value)) {
      return value.map(i => {
        return this.valueToModel(i)
      })
    }
    if (value instanceof SlotJSON || value instanceof AsyncSlotJSON) {
      return this.registry.createSlot(value)
    }
    if (typeof value === 'object' && value !== null) {
      const model: Record<string, any> = {}
      Object.entries(value).forEach(([key, value]) => {
        model[key] = this.valueToModel(value)
      })
      return model
    }
    return value
  }

  private getPaths(): SelectionPaths {
    let anchor: Paths = []
    let focus: Paths = []
    if (this.selection.isSelected) {
      anchor = this.selection.anchorSlot!.__changeMarker__.getPaths()
      focus = this.selection.focusSlot!.__changeMarker__.getPaths()
    }
    return {
      anchor: [...anchor, this.selection.anchorOffset!],
      focus: [...focus, this.selection.focusOffset!]
    }
  }

  private usePaths(paths: SelectionPaths) {
    const anchor = [...paths.anchor]
    const focus = [...paths.focus]
    const anchorOffset = anchor.pop()
    const focusOffset = focus.pop()
    const anchorSlot = this.findModelByPaths(anchor)
    const focusSlot = this.findModelByPaths(focus)

    if (typeof anchorOffset === 'number' && typeof focusOffset === 'number' && anchorSlot instanceof Slot && focusSlot instanceof Slot) {
      this.scheduler.addUpdatedTask(() => {
        this.selection.setBaseAndExtent(anchorSlot, anchorOffset, focusSlot, focusOffset)
      })
    }
  }

  private findModelByPaths(paths: Paths) {
    if (paths.length === 0) {
      return null
    }
    let currentModel: Component | Slot = this.rootComponentRef.component
    paths = [...paths]
    while (paths.length) {
      const path = paths.shift()
      if (currentModel instanceof Component) {
        currentModel = currentModel.state[path as string]
        continue
      }
      if (currentModel instanceof Slot) {
        currentModel = currentModel.getContentAtIndex(path as number) as Component
        continue
      }
      if (Array.isArray(currentModel)) {
        currentModel = currentModel[path as number]
        continue
      }
      if (typeof currentModel === 'object' && currentModel !== null) {
        currentModel = currentModel[path as string]
        continue
      }
      throw historyErrorFn(`cannot find path ${path}`)
    }
    return currentModel || null
  }
}
