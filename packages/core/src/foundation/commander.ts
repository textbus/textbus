import { Injectable } from '@tanbo/di'

import { SelectionLocation, Range, Selection } from './selection'
import {
  ComponentInstance,
  ContentType,
  DeleteEventData,
  Formatter,
  FormatType,
  FormatValue,
  invokeListener,
  placeholder,
  Slot,
  Event,
  InsertEventData,
  EnterEventData
} from '../model/_api'
import { NativeRenderer } from './_injection-tokens'

interface DeleteTreeState extends SelectionLocation {
  success: boolean
}

export type Nullable<T> = {
  [P in keyof T]: T[P] | null
}

/**
 * Textbus 数据操作类，提供一系列的方法，完成文档数据的增删改查的操作
 */
@Injectable()
export class Commander {
  constructor(private selection: Selection,
              private nativeRenderer: NativeRenderer) {
  }

  /**
   * 从源插槽内提取符合 schema 的一组数据，并返回一组插槽，同时删除源插槽在开始到结束位置的内容
   * @param source 源插槽
   * @param schema 新插槽的 schema
   * @param startIndex 提取开始位置
   * @param endIndex 提取结束位置
   */
  extractContentBySchema(source: Slot, schema: ContentType[], startIndex = 0, endIndex = source.length): Slot[] {
    if (schema.length === 0) {
      return []
    }

    let isPreventDefault = true

    const event = new Event<DeleteEventData>(source, {
      count: endIndex - startIndex,
      index: startIndex
    }, () => {
      isPreventDefault = false
    })

    invokeListener(source.parent!, 'onContentDelete', event)

    if (isPreventDefault) {
      return []
    }

    const slot = source.cut(startIndex, endIndex)
    const content = slot.sliceContent()
    const slotList: Slot[] = []
    let len = slot.length
    let i = len

    while (content.length) {
      const item = content.pop()!
      let contentType: ContentType
      if (typeof item === 'string') {
        contentType = ContentType.Text
      } else {
        contentType = item.type
      }
      if (!schema.includes(contentType)) {
        if (len > i) {
          slotList.unshift(slot.cutTo(new Slot(schema), i, len))
          i = len
        }
        if (typeof item !== 'string') {
          item.slots.toArray().forEach(slot => {
            slotList.unshift(...this.extractContentBySchema(slot, schema))
          })
          i--
        }
      }
      len -= item.length
    }
    if (i > 0) {
      slotList.unshift(slot.cutTo(new Slot(schema), 0, i))
    }
    return slotList
  }

  /**
   * 在当前选区内，根据 schema 提取出一组新的插槽和选区位置，并删除选区内的内容。
   * @param schema 新插槽的 schema
   * @param greedy 是否扩展选区，默认为 `false`。当值为 `true` 时，选区会向前后的行内内容扩展，主要用于转换块级内容。
   */
  extractSlots(schema: ContentType[], greedy = false) {
    const range: Nullable<Range> = {
      startSlot: null,
      startOffset: null,
      endSlot: null,
      endOffset: null
    }

    if (!this.selection.isSelected) {
      return {
        range,
        slots: []
      }
    }

    const scopes = greedy ? this.selection.getGreedyScopes() : this.selection.getSelectedScopes()
    const slots: Slot[] = []

    for (const scope of scopes) {
      const childSlots = this.extractContentBySchema(scope.slot, schema, scope.startIndex, scope.endIndex)
      if (scope.slot === this.selection.startSlot) {
        let offset = this.selection.startOffset!
        for (const slot of childSlots) {
          if (offset > slot.length) {
            offset -= slot.length
          } else {
            range.startSlot = slot
            range.startOffset = offset
          }
        }
      }
      if (scope.slot === this.selection.endSlot) {
        let offset = this.selection.endOffset!
        for (const slot of childSlots) {
          if (offset > slot.length) {
            offset -= slot.length
          } else {
            range.endSlot = slot
            range.endOffset = offset
          }
        }
      }
      slots.push(...childSlots)
    }

    if (greedy) {
      const firstScope = scopes[0]
      const lastScope = scopes[scopes.length - 1]
      const {startSlot, startOffset, endSlot, endOffset} = this.selection

      this.selection.setStart(firstScope.slot, 0)
      this.selection.setEnd(lastScope.slot, lastScope.slot.length)

      const is = this.delete()
      if (!is) {
        this.selection.setStart(startSlot!, startOffset!)
        this.selection.setEnd(endSlot!, endOffset!)
      } else {
        this.delete()
      }
    }
    return {
      slots,
      range
    }
  }

  /**
   * 在当前选区插入新内容，当选区未闭合时，会先删除选区内容，再插入新的内容
   * @param content 新插入的内容
   */
  insert(content: string | ComponentInstance): boolean {
    const selection = this.selection
    if (!selection.isSelected) {
      return false
    }

    if (!selection.isCollapsed) {
      const isCollapsed = this.delete(false)
      if (!isCollapsed) {
        return false
      }
    }
    const startSlotRef = selection.startSlot!

    const result = this._insert(startSlotRef, selection.startOffset!, content, true)

    if (result) {
      selection.setLocation(result, result.index)
      invokeListener(result.parent!, 'onContentInserted', new Event<InsertEventData>(result, {
        index: result.index,
        content
      }, () => {
        //
      }))
      return true
    }
    return false
  }

  /**
   * 在当前选区内触发换行操作，如果选区未闭合，则先删除选区内容，再触发回车操作
   */
  enter(): boolean {
    const selection = this.selection
    if (!selection.isSelected) {
      return false
    }

    if (!selection.isCollapsed) {
      const isCollapsed = this.delete(false)
      if (!isCollapsed) {
        return false
      }
    }
    const startSlot = this.selection.startSlot!
    let isPreventDefault = true
    const event = new Event<EnterEventData>(startSlot, {
      index: this.selection.startOffset!
    }, () => {
      isPreventDefault = false
    })
    invokeListener(startSlot.parent!, 'onEnter', event)
    if (isPreventDefault) {
      return false
    }
    const startOffset = this.selection.startOffset!
    const isToEnd = startOffset === startSlot.length || startSlot.isEmpty
    const content = isToEnd ? '\n\n' : '\n'
    const isInserted = this.insert(content)
    if (isInserted && isToEnd) {
      this.selection.setLocation(startSlot, startOffset + 1)
    }
    return true
  }

  /**
   * 触发删除操作，如当前选区未闭合，则删除选区内容。否则触发默认删除操作
   * @param deleteBefore 默认为 `true`，当值为 `true` 时，则向前删除，否则向后删除
   */
  delete(deleteBefore = true): boolean {
    const selection = this.selection
    if (!selection.isSelected) {
      return false
    }
    const startOffset = selection.startOffset!
    const startSlotRefCache = selection.startSlot!
    if (selection.isCollapsed) {
      if (deleteBefore) {
        const prevPosition = selection.getPreviousLocation()!
        selection.setStart(prevPosition.slot, prevPosition.offset)
      } else {
        const nextPosition = selection.getNextLocation()!
        selection.setEnd(nextPosition.slot, nextPosition.offset)
      }
    }

    if (selection.isCollapsed) {
      if (selection.startSlot!.isEmpty) {
        return this.tryCleanDoc()
      }
      return false
      // if (!deleteBefore) {
      //   return false
      // }
      //
      // const firstSlotRef = this.rootComponentRef.childSlotRefs[0]
      // selection.setStart(firstSlotRef, 0)
    }
    if (selection.startSlot === selection.endSlot) {
      const slot = selection.startSlot!
      let isPreventDefault = true
      const event = new Event<DeleteEventData>(slot, {
        count: selection.endOffset! - selection.startOffset!,
        index: selection.startOffset!,
      }, () => {
        isPreventDefault = false
        slot.retain(selection.startOffset!)
        slot.delete(selection.endOffset! - selection.startOffset!)
        selection.collapse()
      })
      invokeListener(selection.startSlot!.parent!, 'onContentDelete', event)
      if (isPreventDefault) {
        selection.setLocation(startSlotRefCache, startOffset)
        return false
      }
      return true
    }
    // 提取尾插槽选区后的内容
    let deletedSlot: Slot | null = null
    const endSlot = selection.endSlot!
    if (!endSlot.isEmpty) {
      const event = new Event<DeleteEventData>(endSlot, {
        index: selection.endOffset!,
        count: endSlot.length - selection.endOffset!
      }, () => {
        deletedSlot = endSlot.cut(selection.endOffset!, endSlot.length)
      })
      invokeListener(endSlot.parent!, 'onContentDelete', event)
    }

    // 删除选中的区域
    const scopes = selection.getSelectedScopes()

    if (selection.endOffset === 0) {
      scopes.push({
        slot: endSlot,
        startIndex: 0,
        endIndex: endSlot.length,
      })
    }

    const commonAncestorSlotRef = selection.commonAncestorSlot!

    const dumpStartSlot = selection.startSlot

    while (scopes.length) {
      const scope = scopes.pop()!
      let stoppedSlot = scope.slot
      const slot = scope.slot

      let isPreventDefault = true
      const event = new Event<DeleteEventData>(slot, {
        count: scope.endIndex - scope.startIndex,
        index: scope.startIndex,
      }, () => {
        isPreventDefault = false
      })
      const parentComponent = scope.slot.parent!
      invokeListener(parentComponent, 'onContentDelete', event)
      if (isPreventDefault) {
        const index = stoppedSlot.index
        if (deletedSlot) {
          this._addContent(deletedSlot, stoppedSlot)
        }
        selection.setEnd(stoppedSlot, index)
        return false
      } else {
        slot.retain(scope.startIndex)
        slot.delete(scope.endIndex - scope.startIndex)
        if (slot === dumpStartSlot) {
          break
        }

        if (parentComponent.slots.length === 0 ||
          parentComponent.slots.length === 1 && slot.isEmpty && parentComponent.slots.has(scope.slot)) {
          const state = this._deleteTree(parentComponent, scope.slot, commonAncestorSlotRef)
          if (!state.success) {
            stoppedSlot = state.slot
            stoppedSlot.retain(state.offset)
            if (deletedSlot) {
              this._addContent(deletedSlot, stoppedSlot)
            }
            selection.setEnd(stoppedSlot, state.offset)

            slot.retain(scope.startIndex)
            slot.delete(scope.endIndex - scope.startIndex)
            return false
          }
        } else {
          let isPreventDefault = true
          const event = new Event<null>(slot, null, () => {
            isPreventDefault = false
          })
          invokeListener(parentComponent, 'onSlotRemove', event)

          if (!isPreventDefault) {
            parentComponent.slots.remove(slot)
          }
        }
      }
    }

    if (deletedSlot) {
      const startSlotRef = selection.startSlot!
      const startOffset = selection.startOffset!
      this._addContent(deletedSlot, startSlotRef)
      selection.setStart(startSlotRef, startOffset)
    }

    selection.collapse()
    return true
  }

  /**
   * 复制当前选区内容
   */
  copy() {
    this.nativeRenderer.copy()
  }

  /**
   * 剪切当前选区内容
   */
  cut() {
    if (this.selection.isCollapsed) {
      return
    }
    this.copy()
    this.delete()
  }

  /**
   * 在当前选区粘贴新内容，当选区未闭合时，会先删除选区内容，再粘贴新内容
   * @param pasteSlot 要粘贴的数据
   * @param text 要粘贴的文本
   */
  paste(pasteSlot: Slot, text: string) {
    if (!this.selection.isSelected) {
      return
    }
    if (!this.selection.isCollapsed) {
      this.delete()
    }
    const component = this.selection.commonAncestorComponent!
    const slot = this.selection.commonAncestorSlot!
    let isPreventDefault = true
    invokeListener(component, 'onPaste', new Event(slot, {
      index: this.selection.startOffset!,
      data: pasteSlot,
      text
    }, () => {
      isPreventDefault = false
    }))
    if (isPreventDefault) {
      return
    }
    const contents = pasteSlot.sliceContent()

    contents.forEach(i => {
      this.insert(i)
    })
  }

  /**
   * 清除当前选区的所有格式
   * @param ignoreFormatters 在清除格式时，忽略的格式
   */
  cleanFormats(ignoreFormatters: Formatter[] = []) {
    const selection = this.selection
    selection.getBlocks().forEach(scope => {
      if (scope.slot === selection.startSlot &&
        scope.startIndex <= selection.startOffset!) {
        scope.startIndex = selection.startOffset!
      }
      if (scope.slot === selection.endSlot &&
        scope.endIndex >= selection.endOffset!) {
        scope.endIndex = selection.endOffset!
      }
      let isDeleteBlockFormat = false
      const slot = scope.slot
      if (scope.startIndex === 0) {
        if (scope.endIndex === slot.length) {
          isDeleteBlockFormat = true
        } else if (scope.endIndex === slot.length - 1) {
          const lastContent = slot.getContentAtIndex(slot.length - 1)
          if (lastContent === '\n') {
            isDeleteBlockFormat = true
          }
        }
      }

      slot.getFormats().forEach(i => {
        if (i.formatter.type === FormatType.Block && !isDeleteBlockFormat || ignoreFormatters.includes(i.formatter)) {
          return
        }
        slot.retain(scope.startIndex)
        slot.retain(scope.endIndex - scope.startIndex, i.formatter, null)
      })
    })
  }

  /**
   * 给当前选区应用新的格式
   * @param formatter 要应用的格式
   * @param value 当前格式要应用的值
   */
  applyFormat(formatter: Formatter, value: FormatValue) {
    if (this.selection.isCollapsed) {
      const slot = this.selection.commonAncestorSlot!
      if (formatter.type === FormatType.Block || slot.isEmpty) {
        slot.retain(0)
        slot.retain(slot.length, formatter, value)
      } else {
        this.insert(placeholder)
        const startOffset = this.selection.startOffset!
        slot.retain(startOffset - 1)
        slot.retain(1, formatter, value)
      }
      return
    }
    this.selection.getSelectedScopes().forEach(i => {
      i.slot.retain(i.startIndex)
      i.slot.retain(i.endIndex - i.startIndex, formatter, value)
    })
  }

  /**
   * 清除当前选区特定的格式
   * @param formatter 要清除的格式
   */
  unApplyFormat(formatter: Formatter) {
    if (this.selection.isCollapsed) {
      const slot = this.selection.commonAncestorSlot!
      if (formatter.type === FormatType.Block || slot.isEmpty) {
        slot.retain(0)
        slot.retain(slot.length, formatter, null)
      } else {
        const startOffset = this.selection.startOffset!
        const prevContent = slot.getContentAtIndex(startOffset - 1)
        if (prevContent === placeholder) {
          slot.retain(startOffset - 1)
          slot.retain(1, formatter, null)
        } else {
          this.insert(placeholder)
          slot.retain(startOffset)
          slot.retain(1, formatter, null)
        }
      }
      return
    }
    this.selection.getSelectedScopes().forEach(i => {
      i.slot.retain(i.startIndex)
      i.slot.retain(i.endIndex - i.startIndex, formatter, null)
    })
  }

  /**
   * 在指定组件前插入新的组件
   * @param component 要插入的组件
   * @param ref 新组件插入组件位置的引用
   */
  insertBefore(component: ComponentInstance, ref: ComponentInstance) {
    const parentSlot = ref?.parent

    if (parentSlot) {
      const index = parentSlot.indexOf(ref)
      parentSlot.retain(index)
      parentSlot.insert(component)
    }
  }
  /**
   * 在指定组件后插入新的组件
   * @param component 要插入的组件
   * @param ref 新组件插入组件位置的引用
   */
  insertAfter(component: ComponentInstance, ref: ComponentInstance) {
    const parentSlot = ref?.parent

    if (parentSlot) {
      const index = parentSlot.indexOf(ref)
      parentSlot.retain(index + 1)
      parentSlot.insert(component)
    }
  }

  /**
   * 用新组件替换旧组件
   * @param source 要删除的组件
   * @param target 新插入的组件
   */
  replace(source: ComponentInstance, target: ComponentInstance) {
    this.insertBefore(target, source)
    this.remove(source)
  }

  /**
   * 删除指定组件
   * @param component
   */
  remove(component: ComponentInstance) {
    const parentSlot = component?.parent

    if (parentSlot) {
      const index = parentSlot.indexOf(component)
      parentSlot.retain(index)
      parentSlot.delete(1)
    }
  }

  private tryCleanDoc(): boolean {
    let slot = this.selection.startSlot
    while (slot) {
      const parentComponent = slot.parent!
      if (parentComponent.slots.length > 1) {
        return false
      }
      const parentSlot = parentComponent.parent
      if (parentSlot) {
        parentSlot.removeComponent(parentComponent)
        if (parentSlot.sliceContent().filter(i => typeof i !== 'string').length !== 0) {
          return true
        }
      } else {
        slot.cut()
        this.selection.setLocation(slot, 0)
        return true
      }
      slot = parentSlot
    }
    return false
  }

  private _addContent(source: Slot, targetSlot: Slot) {
    if (source.isEmpty && !targetSlot.isEmpty) {
      return true
    }
    const deletedContent = source.sliceContent()
    while (deletedContent.length) {
      const firstContent = deletedContent.shift()!
      const isInsert = this._insert(targetSlot, targetSlot.index, firstContent, false)
      if (isInsert) {
        targetSlot = isInsert
        const index = targetSlot.index
        const startIndex = index - firstContent.length
        source.cut(0, firstContent.length).getFormats().forEach(i => {
          if (i.formatter.type !== FormatType.Block) {
            targetSlot.retain(startIndex + i.startIndex)
            targetSlot.retain(i.endIndex - i.startIndex, i.formatter, i.value)
          }
        })
        targetSlot.retain(index)
      } else {
        return false
      }
    }
    return true
  }

  private _insert(target: Slot, index: number, content: string | ComponentInstance, expand: boolean): false | Slot {
    let isPreventDefault = true
    const event = new Event<InsertEventData>(target, {
      index: this.selection.startOffset!,
      content
    }, () => {
      isPreventDefault = false
    })
    invokeListener(target.parent!, 'onContentInsert', event)
    if (isPreventDefault) {
      return false
    }

    target.retain(index)
    const isInserted = expand ? target.write(content) : target.insert(content)
    if (!isInserted) {
      const parentComponent = target.parent!

      const slotRefIndex = parentComponent.slots.indexOf(target)
      const nextSlotRef = parentComponent.slots.get(slotRefIndex + 1)
      // 这里有 bug，如果相邻的下一个插件无法插入，不应递归再向后
      if (nextSlotRef) {
        return this._insert(nextSlotRef, 0, content, expand)
      }
      const parentSlot = parentComponent.parent
      if (!parentSlot) {
        return false
      }
      return this._insert(parentSlot, parentSlot.indexOf(parentComponent) + 1, content, expand)
    }

    return target
  }

  private _deleteTree(component: ComponentInstance, currentSlot: Slot, stopSlot: Slot): DeleteTreeState {
    const parentSlot = component.parent
    if (parentSlot) {
      const index = parentSlot.indexOf(component)

      let isPreventDefault = true
      const event = new Event<DeleteEventData>(parentSlot, {
        count: 1,
        index: index,
      }, () => {
        isPreventDefault = false
      })
      invokeListener(parentSlot.parent!, 'onContentDelete', event)
      if (!isPreventDefault) {
        parentSlot.retain(index)
        parentSlot.delete(1)
        if (parentSlot === stopSlot || !parentSlot.isEmpty) {
          return {
            success: true,
            slot: parentSlot,
            offset: parentSlot.index
          }
        }
        const parentComponent = parentSlot.parent!
        if (parentComponent.slots.length > 1) {
          const index = parentComponent.slots.indexOf(parentSlot)
          let isPreventDefault = true
          const event = new Event<null>(parentSlot, null, () => {
            isPreventDefault = false
          })
          invokeListener(parentComponent, 'onSlotRemove', event)
          if (!isPreventDefault) {
            parentComponent.slots.remove(parentSlot)
          }
          if (index === 0) {
            const p = parentComponent.parent!
            return {
              success: true,
              slot: p,
              offset: p.indexOf(parentComponent)
            }
          }
          const prevSlotRef = parentComponent.slots.get(index - 1)!
          const position = this.selection.findLastLocation(prevSlotRef)
          return {
            success: true,
            slot: position.slot,
            offset: position.offset
          }
        }
        return this._deleteTree(parentComponent, parentSlot, stopSlot)
      }
    }
    return {
      success: true,
      slot: currentSlot,
      offset: currentSlot.index
    }
  }
}
