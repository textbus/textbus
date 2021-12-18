import { Injectable } from '@tanbo/di'
import { debounceTime, Observable, Subject, Subscription, tap } from '@tanbo/stream'

import { ComponentLiteral, Formats, Operation } from '../model/_api'
import { Translator } from './translator'
import { Renderer } from './renderer'
import { SelectionPaths, TBSelection } from './selection'
import { FormatterList } from './formatter-list'
import { RootComponentRef } from './_injection-tokens'

export interface HistoryItem {
  beforePaths: SelectionPaths
  afterPaths: SelectionPaths
  operations: Operation[]
}

@Injectable()
export class History {
  onChange: Observable<void>

  get canBack() {
    return this.historySequence.length > 0 && this.index > 0
  }

  get canForward() {
    return this.historySequence.length > 0 && this.index < this.historySequence.length
  }

  private index = 0
  private historySequence: HistoryItem[] = []

  private changeEvent = new Subject<void>()

  private subscription: Subscription | null = null

  constructor(private root: RootComponentRef,
              private selection: TBSelection,
              private translator: Translator,
              private renderer: Renderer,
              private formatMap: FormatterList) {
    this.onChange = this.changeEvent.asObservable()
  }

  listen() {
    this.renderer.render(this.root.component)
    this.record()
  }

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

  destroy() {
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
      this.renderer.render(this.root.component)
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
            slot.setState(action.state)
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
            component.useState(action.state)
            return
          }
        })
      }
    })

    this.renderer.render(this.root.component)
  }
}
