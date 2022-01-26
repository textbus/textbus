import { Injectable } from '@tanbo/di'
import { debounceTime, Observable, Subject, Subscription, tap } from '@tanbo/stream'
import { applyPatches } from 'immer'

import { ComponentLiteral, Formats, Operation } from '../model/_api'
import { Translator } from './translator'
import { Renderer } from './renderer'
import { SelectionPaths, Selection } from './selection'
import { FormatterList } from './formatter-list'
import { RootComponentRef } from './_injection-tokens'

export interface HistoryItem {
  beforePaths: SelectionPaths
  afterPaths: SelectionPaths
  operations: Operation[]
}

/**
 * TextBus 历史记录管理类
 */
@Injectable()
export class History {
  /**
   * 当历史记录变化时触发
   */
  onChange: Observable<void>

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

  private subscription: Subscription | null = null

  constructor(private root: RootComponentRef,
              private selection: Selection,
              private translator: Translator,
              private renderer: Renderer,
              private formatMap: FormatterList) {
    this.onChange = this.changeEvent.asObservable()
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
      this.stop()
      const item = this.historySequence[this.index]
      this.apply(item, false)
      this.selection.usePaths(item.afterPaths)
      this.selection.restore()
      this.index++
      this.record()
      this.changeEvent.next()
    }
  }

  /**
   * 撤消操作
   */
  back() {
    if (this.canBack) {
      this.stop()
      const item = this.historySequence[this.index - 1]
      this.apply(item, true)
      this.selection.usePaths(item.beforePaths)
      this.selection.restore()
      this.index--
      this.record()
      this.changeEvent.next()
    }
  }

  /**
   * 销毁历史记录实例
   */
  destroy() {
    this.historySequence = []
    this.stop()
  }

  private record() {
    let operations: Operation [] = []
    let beforePaths = this.selection.getPaths()
    this.subscription = this.root.component.changeMarker.onChange.pipe(
      tap(op => {
        operations.push(op)
      }),
      debounceTime(1)
    ).subscribe(() => {
      this.renderer.render()
      this.selection.restore()
      this.historySequence.length = this.index
      this.index++
      const afterPaths = this.selection.getPaths()
      this.historySequence.push({
        operations,
        beforePaths,
        afterPaths
      })
      beforePaths = afterPaths
      operations = []
      this.changeEvent.next()
    })
  }

  private stop() {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
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
              Object.keys(action.formats).map(i => {
                const formatter = this.formatMap.get(i)
                if (formatter) {
                  formats.push([formatter, action.formats![i]])
                }
              })
              slot.retain(action.index, formats)
            } else {
              slot.retain(action.index)
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
                Object.keys(action.formats).map(i => {
                  const formatter = this.formatMap.get(i)
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
        const component = this.selection.findComponentByPath(path)!
        actions.forEach(action => {
          if (action.type === 'retain') {
            component.slots.retain(action.index)
            return
          }
          if (action.type === 'delete') {
            component.slots.delete(action.count)
            return
          }
          if (action.type === 'insertSlot') {
            const source = component.slots.slotRestore(action.slot)
            source.cut()
            const slot = this.translator.fillSlot(action.slot, source)
            component.slots.insert(slot)
          }
          if (action.type === 'apply') {
            component.updateState(draft => {
              applyPatches(draft, action.patches)
            })
            return
          }
        })
      }
    })

    this.renderer.render()
  }
}
