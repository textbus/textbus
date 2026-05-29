import { Injectable } from '@viewfly/core'

import { AbstractSelection, Range, Selection, SelectionPosition } from './selection'
import {
  Attribute,
  BreakEventData,
  Component,
  ContentType,
  DeleteEventData,
  DeltaLite,
  Event,
  Formats,
  Formatter,
  FormatValue,
  InsertEventData,
  invokeListener, PendingErasure,
  Slot,
  SlotApplyFormatEventData,
  SlotRange,
  SlotSetAttributeEventData
} from '../model/_api'
import { RootComponentRef } from './_injection-tokens'
import { Registry } from './registry'
import { Textbus } from '../textbus'
import { Adapter } from './adapter'
import { makeError } from '../_utils/make-error'

const commanderErrorFn = makeError('Commander')

function canInsert(content: string | Component, target: Slot) {
  const insertType = typeof content === 'string' ? ContentType.Text : content.type
  return target.schema.includes(insertType)
}

function getNextInsertPosition(currentSlot: Slot,
                               content: string | Component,
                               index: number,
                               excludeSlots: Slot[]): SelectionPosition | null {
  if (!excludeSlots.includes(currentSlot)) {
    return {
      slot: currentSlot,
      offset: index
    }
  }
  // 查找同插槽下当前位置后的子组件插槽
  const afterContent = currentSlot.sliceContent(index + 1)
  const afterSiblingComponents = afterContent.filter((i): i is Component => {
    return typeof i !== 'string'
  })

  while (afterSiblingComponents.length) {
    const firstComponent = afterSiblingComponents.shift()
    if (firstComponent && firstComponent.slots.length) {
      return {
        slot: firstComponent.slots.at(0)!,
        offset: 0
      }
    }
  }

  // 当相邻插槽无法插入时，向上查找可插入位置
  const parentComponent = currentSlot.parent
  if (!parentComponent) {
    return null
  }
  const parentSlot = parentComponent.parent
  if (!parentSlot) {
    return null
  }
  const parentIndex = parentSlot.indexOf(parentComponent)
  return getNextInsertPosition(parentSlot, content, parentIndex + 1, excludeSlots)
}

function deleteUpBySlot(selection: Selection,
                        slot: Slot,
                        offset: number,
                        stopComponent: Component,
                        deleteBefore: boolean,
                        keepOn?: (slot: Slot) => boolean): SelectionPosition {
  const parentComponent = slot.parent
  if (!parentComponent) {
    return {
      slot,
      offset
    }
  }
  const parentSlot = parentComponent.parent

  // 单插槽组件
  if (parentComponent.slots.length === 1) {
    if (parentComponent === stopComponent) {
      return {
        slot,
        offset
      }
    }
    if (!parentSlot) {
      return {
        slot,
        offset
      }
    }
    const index = parentSlot.indexOf(parentComponent)
    const event = new Event<Slot, DeleteEventData>(parentSlot, {
      index,
      count: 1,
      toEnd: !deleteBefore,
      actionType: 'delete'
    })
    invokeListener(parentSlot.parent!, 'onContentDelete', event)
    if (event.isPrevented) {
      return {
        slot,
        offset
      }
    }
    parentSlot.retain(index)
    parentSlot.delete(1)
    invokeListener(parentSlot.parent!, 'onContentDeleted', new Event(parentSlot, null))
    if (parentSlot.isEmpty) {
      if (typeof keepOn === 'function') {
        const b = keepOn(parentSlot)
        if (!b) {
          return {
            slot: parentSlot,
            offset: 0
          }
        }
      }
      return deleteUpBySlot(selection, parentSlot, index, stopComponent, deleteBefore)
    }
    return {
      slot: parentSlot,
      offset: parentSlot.index
    }
  }
  if (typeof keepOn === 'function') {
    const b = keepOn(slot)
    if (!b) {
      return {
        slot,
        offset: 0
      }
    }
  }
  const position = selection.getPreviousPositionByPosition(slot, 0)
  if (parentComponent.removeSlot?.(slot)) {
    return position
  }

  return {
    slot,
    offset
  }
}

/**
 * 组件转换规则
 */
export interface TransformRule {
  /** 目标组件的数据类型 */
  targetType: ContentType

  /**
   * 创建目标组件新插槽的工厂函数
   * @param from
   */
  slotFactory(from: Component<any>): Slot

  /**
   * 创建组件状态的工厂函数
   */
  stateFactory(slots: Slot[], textbus: Textbus): Component<any>[]
}

@Injectable()
export class Commander {

  constructor(protected selection: Selection,
              protected adapter: Adapter,
              protected textbus: Textbus,
              protected registry: Registry,
              protected rootComponentRef: RootComponentRef) {
  }

  /**
   * 将选区内容转换为指定组件
   * @param rule
   */
  transform(rule: TransformRule): boolean {
    const selection = this.selection
    if (!selection.isSelected) {
      return false
    }

    const abstractSelection: AbstractSelection = {
      anchorSlot: selection.anchorSlot!,
      anchorOffset: selection.anchorOffset!,
      focusSlot: selection.focusSlot!,
      focusOffset: selection.focusOffset!
    }

    const ranges = selection.getRanges()
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i]
      const isTransformed = this.transformByRange(rule, abstractSelection, range)
      if (!isTransformed) {
        break
      }
    }

    selection.setBaseAndExtent(
      abstractSelection.anchorSlot,
      abstractSelection.anchorOffset,
      abstractSelection.focusSlot,
      abstractSelection.focusOffset
    )
    return true
  }

  /**
   * 在当前选区插入新内容，当选区未闭合时，会先删除选区内容，再插入新的内容
   * 在插入新内容时，write 方法还会把相邻的样式应用到新内容上
   * @param content 新插入的内容
   * @param formats 新的格式
   */
  write(content: string | Component, formats?: Formats): boolean
  write<T extends FormatValue>(content: string | Component, formatter?: Formatter<T>, value?: T): boolean
  write<T extends FormatValue>(content: string | Component, formatter?: Formatter<T> | Formats, value?: T): boolean {
    const selection = this.selection
    const is = selection.isCollapsed ? true : this.delete()
    if (!is || !selection.isSelected) {
      return false
    }

    const position: SelectionPosition = {
      slot: selection.startSlot!,
      offset: selection.startOffset!
    }

    let formats: Formats = []
    if (canInsert(content, position.slot)) {
      const nextFormats = position.slot.extractFormatsByIndex(position.offset)
      formats = position.slot.extractFormatsByIndex(position.offset - 1).filter(i => {
        return i[0].inheritable || nextFormats.some(value => {
          return value[0] === i[0] && value[1] === i[1]
        })
      })
    }
    if (formatter) {
      if (Array.isArray(formatter)) {
        formats = [
          ...formats,
          ...formatter
        ]
      } else {
        formats.push([formatter, value as FormatValue])
      }
    }
    return this.insert(content, formats)
  }

  /**
   * 在当前选区插入新内容，当选区未闭合时，会先删除选区内容，再插入新的内容
   * @param content 新插入的内容
   * @param formats 新的格式
   */
  insert(content: string | Component, formats?: Formats): boolean
  insert<T extends FormatValue>(content: string | Component, formatter?: Formatter<T>, value?: T): boolean
  insert<T extends FormatValue>(content: string | Component, formatter?: Formatter<T> | Formats, value?: T): boolean {
    const selection = this.selection
    const is = selection.isCollapsed ? true : this.delete()
    if (!is) {
      return false
    }
    let formats: Formats = []
    if (formatter) {
      if (Array.isArray(formatter)) {
        formats = formatter
      } else {
        formats.push([formatter, value as FormatValue])
      }
    }

    let slot = selection.startSlot!
    let offset = selection.startOffset!
    const excludeSlots: Slot[] = []
    while (true) {
      const event = new Event<Slot, InsertEventData>(slot, {
        index: offset,
        content,
        formats
      })
      invokeListener(slot.parent!, 'onContentInsert', event)
      if (!event.isPrevented) {
        if (canInsert(content, slot)) {
          slot.retain(offset)
          slot.insert(content, formats)
          const insertedEvent = new Event<Slot, InsertEventData>(slot, {
            index: offset,
            content,
            formats
          })
          invokeListener(slot.parent!, 'onContentInserted', insertedEvent)
          if (!insertedEvent.isPrevented) {
            selection.setBaseAndExtent(slot, slot.index, slot, slot.index)
          }
        } else {
          excludeSlots.push(slot)
          const p = getNextInsertPosition(slot, content, offset, excludeSlots)
          if (p) {
            slot = p.slot
            offset = p.offset
            continue
          }
          return false
        }
      }
      return true
    }
  }

  /**
   * 触发删除操作，如当前选区未闭合，则删除选区内容。否则触发默认删除操作
   * @param deleteBefore 默认为 `true`，当值为 `true` 时，则向前删除，否则向后删除
   */
  delete(deleteBefore?: boolean): boolean
  delete(receiver: (slot: Slot) => void, deleteBefore?: boolean): boolean
  delete(receiver?: any, deleteBefore = true): boolean {
    if (typeof receiver === 'boolean') {
      deleteBefore = receiver
      receiver = function () {
        //
      }
    } else if (typeof receiver !== 'function') {
      receiver = function () {
        //
      }
    }
    const selection = this.selection
    if (!selection.isSelected) {
      return false
    }

    let endSlot = selection.endSlot!
    let endOffset = selection.endOffset!
    let startSlot = selection.startSlot!
    let startOffset = selection.startOffset!
    let isDeleteRanges = true
    if (selection.isCollapsed) {
      if (deleteBefore) {
        const beforeContent = startSlot.getContentAtIndex(startOffset - 1)
        if (beforeContent instanceof Component &&
          (beforeContent.type === ContentType.BlockComponent || beforeContent.deleteAsWhole)) {
          this.removeComponent(beforeContent)
          return true
        }
        if (startOffset === 0) {
          isDeleteRanges = false
        }
        const prevPosition = selection.getPreviousPosition()!
        startSlot = prevPosition.slot
        startOffset = prevPosition.offset
      } else {
        const content = startSlot.getContentAtIndex(startOffset)
        if (content instanceof Component &&
          (content.type === ContentType.BlockComponent || content.deleteAsWhole)) {
          this.removeComponent(content)
          return true
        }
        const nextPosition = selection.getNextPosition()!
        endSlot = nextPosition.slot
        endOffset = nextPosition.offset
      }
    }

    if (startSlot === endSlot && startOffset === endOffset) {
      if (startSlot!.isEmpty) {
        receiver(startSlot.cut())
        const position = deleteUpBySlot(selection, startSlot, startOffset, this.rootComponentRef.component, deleteBefore)
        selection.setBaseAndExtent(position.slot, position.offset, position.slot, position.offset)
        return position.slot !== startSlot || position.offset !== startOffset
      }
      return false
    }
    const scopes = selection.getScopes(startSlot, startOffset, endSlot, endOffset, true)
    let endCutIndex = endOffset

    while (isDeleteRanges && scopes.length) {
      const lastScope = scopes.pop()!
      const { slot, startIndex } = lastScope
      const endIndex = lastScope.endIndex
      const isFocusEnd = selection.focusSlot === slot && selection.focusOffset === endIndex
      const event = new Event<Slot, DeleteEventData>(slot, {
        index: startIndex,
        count: endIndex - startIndex,
        toEnd: !deleteBefore,
        actionType: 'delete'
      })
      invokeListener(slot.parent!, 'onContentDelete', event)
      if (event.isPrevented) {
        return false
      }
      const deletedSlot = slot.cut(startIndex, endIndex)
      receiver(deletedSlot)
      const deletedEvent = new Event(slot, null)
      invokeListener(slot.parent!, 'onContentDeleted', deletedEvent)
      if (deletedEvent.isPrevented) {
        if (isFocusEnd) {
          selection.setFocus(slot, endIndex)
        } else {
          selection.setAnchor(slot, endIndex)
        }
        return false
      }
      if (slot === endSlot) {
        endCutIndex = startIndex
      }
      if (slot !== startSlot && slot !== endSlot && slot.isEmpty) {
        const position = deleteUpBySlot(selection, slot, startIndex, this.rootComponentRef.component, deleteBefore)
        if (position.slot === endSlot) {
          endCutIndex = position.offset
        }
      }
    }
    if (startSlot !== endSlot) {
      const event = new Event<Slot, DeleteEventData>(endSlot, {
        index: endCutIndex,
        count: endSlot.length,
        toEnd: !deleteBefore,
        actionType: 'move'
      })
      invokeListener(endSlot.parent!, 'onContentDelete', event)
      if (event.isPrevented) {
        return false
      }
      const deletedSlot = endSlot.cut(endCutIndex)
      receiver(deletedSlot)
      const deletedEvent = new Event(endSlot, null)
      invokeListener(endSlot.parent!, 'onContentDeleted', deletedEvent)
      if (!deletedEvent.isPrevented) {
        if (endSlot.isEmpty) {
          deleteUpBySlot(selection, endSlot, 0, this.rootComponentRef.component, deleteBefore)
        }
      }
      if (!deletedSlot.isEmpty) {
        // const formats = deletedSlot.extractFormatsByIndex(0)
        // formats.forEach(item => {
        //   if (item[0].type === FormatType.Block) {
        //     deletedSlot.removeAttribute(item[0])
        //   }
        // })
        const deletedDelta = deletedSlot.toDelta()
        selection.setPosition(startSlot, startOffset)
        deletedDelta.forEach(item => {
          this.insert(item.insert, item.formats)
        })
      }
      if (deletedEvent.isPrevented) {
        return false
      }
    }
    selection.setBaseAndExtent(startSlot, startOffset, startSlot, startOffset)
    return true
  }

  /**
   * 在当前选区内触发换行操作，如果选区未闭合，则先删除选区内容，再触发回车操作
   */
  break(): boolean {
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
    const event = new Event<Slot, BreakEventData>(startSlot, {
      index: this.selection.startOffset!
    })

    invokeListener(startSlot.parent!, 'onBreak', event)

    if (!event.isPrevented) {
      const startOffset = this.selection.startOffset!
      const isToEnd = startOffset === startSlot.length || startSlot.isEmpty
      const content = isToEnd ? '\n\n' : '\n'
      const isInserted = this.write(content)
      if (isInserted && isToEnd) {
        this.selection.setPosition(startSlot, startOffset + 1)
      }
    }
    return !event.isPrevented
  }

  /**
   * 在指定组件前插入新的组件
   * @param newChild 要插入的组件
   * @param ref 新组件插入组件位置的引用
   */
  insertBefore(newChild: Component, ref: Component): boolean {
    const parentSlot = ref?.parent
    if (parentSlot) {
      this.selection.selectComponent(newChild)
      this.delete()
      const index = parentSlot.indexOf(ref)
      this.selection.setBaseAndExtent(parentSlot, index, parentSlot, index)
      return this.insert(newChild)
    }
    return false
  }

  /**
   * 在指定组件后插入新的组件
   * @param newChild 要插入的组件
   * @param ref 新组件插入组件位置的引用
   */
  insertAfter(newChild: Component, ref: Component): boolean {
    const parentSlot = ref?.parent
    if (parentSlot) {
      this.selection.selectComponent(newChild)
      this.delete()
      const index = parentSlot.indexOf(ref) + 1
      this.selection.setBaseAndExtent(parentSlot, index, parentSlot, index)
      return this.insert(newChild)
    }
    return false
  }

  /**
   * 用新组件替换旧组件
   * @param oldComponent 要删除的组件
   * @param newComponent 新插入的组件
   */
  replaceComponent(oldComponent: Component, newComponent: Component): boolean {
    const b = this.removeComponent(oldComponent)
    if (b) {
      return this.insert(newComponent)
    }
    return false
  }

  /**
   * 复制当前选区内容
   */
  copy() {
    this.adapter.copy()
  }

  /**
   * 剪切当前选区内容
   */
  cut() {
    this.copy()
    if (this.selection.isCollapsed) {
      return false
    }
    return this.delete()
  }

  /**
   * 在当前选区粘贴新内容，当选区未闭合时，会先删除选区内容，再粘贴新内容
   * @param pasteSlot 要粘贴的数据
   * @param text 要粘贴的文本
   */
  paste(pasteSlot: Slot, text: string) {
    if (pasteSlot.isEmpty) {
      return false
    }
    const selection = this.selection
    if (!selection.isSelected) {
      return false
    }
    if (!selection.isCollapsed) {
      this.delete()
    }
    const component = selection.commonAncestorComponent!
    const slot = selection.commonAncestorSlot!
    const event = new Event(slot, {
      index: selection.startOffset!,
      data: pasteSlot,
      text
    })
    invokeListener(component, 'onPaste', event)
    if (!event.isPrevented) {
      const delta = pasteSlot.toDelta()
      const afterDelta = new DeltaLite()
      while (delta.length) {
        const { insert, formats } = delta.shift()!
        const commonAncestorSlot = selection.commonAncestorSlot!

        if (this.insert(insert, formats)) {
          continue
        }

        afterDelta.push(...commonAncestorSlot.cut(selection.startOffset!).toDelta())
        const parentComponent = commonAncestorSlot.parent!

        if (parentComponent.separate) {
          const index = parentComponent.slots.indexOf(commonAncestorSlot)
          const nextSlot = parentComponent.slots.at(index + 1)
          const nextComponent = parentComponent.separate(nextSlot)
          afterDelta.push({
            insert: nextComponent,
            formats: []
          })
        }
        const position = getNextInsertPosition(
          this.selection.startSlot!,
          insert,
          this.selection.startOffset!,
          [this.selection.startSlot!])
        if (position) {
          this.selection.setPosition(position.slot, position.offset)
          this.insert(insert, formats)
        }
      }
      const snapshot = this.selection.createSnapshot()
      while (afterDelta.length) {
        const { insert, formats } = afterDelta.shift()!
        this.insert(insert, formats)
      }
      snapshot.restore()
      const currentContent = selection.startSlot!.getContentAtIndex(selection.startOffset!)
      if (currentContent &&
        typeof currentContent !== 'string' &&
        currentContent.type === ContentType.BlockComponent &&
        currentContent.slots.length > 0) {
        selection.toNext()
      }
    }
    return !event.isPrevented
  }

  /**
   * 清除当前选区的所有格式
   * @param remainFormats 要保留的格式；可为格式类数组，或 `(formatter) => boolean` 谓词
   */
  cleanFormats(remainFormats: Formatter[] | ((formatter: Formatter) => boolean) = []) {
    this.selection.getSelectedScopes().forEach(scope => {
      const slot = scope.slot
      if (scope.startIndex === 0) {
        if (scope.endIndex === slot.length - 1) {
          const lastContent = slot.getContentAtIndex(slot.length - 1)
          if (lastContent === '\n') {
            scope.endIndex++
          }
        }
      }
      slot.cleanFormats(remainFormats, scope.startIndex, scope.endIndex)
    })
  }

  /**
   * 给当前选区应用新的格式
   * @param formatter 要应用的格式
   * @param value 当前格式要应用的值
   */
  applyFormat<T extends FormatValue>(formatter: Formatter<T>, value: T) {
    function canApplyFormat(slot: Slot, formatter: Formatter<T>, value: any) {
      const event = new Event<Slot, SlotApplyFormatEventData>(slot, {
        formatter,
        value
      })
      invokeListener(slot.parent!, 'onSlotApplyFormat', event)
      return !event.isPrevented
    }

    if (this.selection.isCollapsed) {
      const slot = this.selection.commonAncestorSlot!
      if (slot.isEmpty) {
        slot.retain(0)
        slot.retain(slot.length, formatter, value, canApplyFormat)
      } else {
        this.write(Slot.placeholder)
        const startOffset = this.selection.startOffset!
        slot.retain(startOffset - 1)
        slot.retain(1, formatter, value, canApplyFormat)
      }
      return
    }
    this.selection.getSelectedScopes().forEach(i => {
      i.slot.retain(i.startIndex)
      i.slot.retain(i.endIndex - i.startIndex, formatter, value, canApplyFormat)
    })
  }

  /**
   * 清除当前选区特定的格式
   * @param formatter 要清除的格式
   * @param rule 指定清除规划
   */
  unApplyFormat<T>(formatter: Formatter<T>, rule?: PendingErasure<T>) {
    const formatValue = rule || null
    if (this.selection.isCollapsed) {
      const slot = this.selection.commonAncestorSlot!
      if (slot.isEmpty) {
        slot.retain(0)
        slot.retain(slot.length, formatter, formatValue)
      } else {
        const startOffset = this.selection.startOffset!
        const prevContent = slot.getContentAtIndex(startOffset - 1)
        if (prevContent === Slot.placeholder) {
          slot.retain(startOffset - 1)
          slot.retain(1, formatter, formatValue)
        } else {
          this.write(Slot.placeholder)
          slot.retain(startOffset)
          slot.retain(1, formatter, formatValue)
        }
      }
      return
    }
    this.selection.getSelectedScopes().forEach(i => {
      i.slot.retain(i.startIndex)
      i.slot.retain(i.endIndex - i.startIndex, formatter, formatValue)
    })
  }

  /**
   * 根据选区应用插槽属性
   * @param attribute
   * @param value
   */
  applyAttribute<T extends FormatValue>(attribute: Attribute<T>, value: T) {
    function canApplyAttr(slot: Slot, attr: Attribute, value: any) {
      const event = new Event<Slot, SlotSetAttributeEventData>(slot, {
        attribute,
        value
      })
      invokeListener(slot.parent!, 'onSlotSetAttribute', event)
      return !event.isPrevented
    }

    if (this.selection.isCollapsed) {
      const slot = this.selection.commonAncestorSlot!
      slot.setAttribute(attribute, value, canApplyAttr)
      return
    }
    this.selection.getSelectedScopes().forEach(i => {
      const contents = i.slot.sliceContent(i.startIndex, i.endIndex)
      const childComponents: Component[] = []
      let hasInlineContent = false
      contents.forEach(item => {
        if (typeof item === 'string' || item.type === ContentType.InlineComponent) {
          hasInlineContent = true
        } else {
          childComponents.push(item)
        }
      })
      if (hasInlineContent) {
        i.slot.setAttribute(attribute, value, canApplyAttr)
      } else {
        childComponents.forEach(i => {
          i.slots.forEach(slot => {
            slot.setAttribute(attribute, value, canApplyAttr)
          })
        })
      }
    })
  }

  /**
   * 根据选区清除插槽属性
   * @param attribute
   */
  unApplyAttribute(attribute: Attribute) {
    if (this.selection.isCollapsed) {
      const slot = this.selection.commonAncestorSlot!
      slot.removeAttribute(attribute)
      return
    }
    this.selection.getSelectedScopes().forEach(i => {
      const contents = i.slot.sliceContent(i.startIndex, i.endIndex)
      const childComponents: Component[] = []
      let hasInlineContent = false
      contents.forEach(item => {
        if (typeof item === 'string' || item.type === ContentType.InlineComponent) {
          hasInlineContent = true
        } else {
          childComponents.push(item)
        }
      })
      if (hasInlineContent) {
        i.slot.removeAttribute(attribute)
      } else {
        childComponents.forEach(i => {
          i.slots.forEach(slot => {
            slot.removeAttribute(attribute)
          })
        })
      }
    })
  }

  /**
   * 根据选区清除属性
   * @param remainAttributes 要保留的属性；可为属性类数组，或 `(attribute) => boolean` 谓词
   */
  cleanAttributes(remainAttributes: Attribute[] | ((attribute: Attribute) => boolean) = []) {
    this.selection.getSelectedScopes().forEach(i => {
      const contents = i.slot.sliceContent(i.startIndex, i.endIndex)
      const childComponents: Component[] = []
      let hasInlineContent = false
      contents.forEach(item => {
        if (typeof item === 'string' || item.type === ContentType.InlineComponent) {
          hasInlineContent = true
        } else {
          childComponents.push(item)
        }
      })
      if (hasInlineContent) {
        i.slot.cleanAttributes(remainAttributes)
      } else {
        childComponents.forEach(i => {
          i.slots.forEach(slot => {
            slot.cleanAttributes(remainAttributes)
          })
        })
      }
    })
  }

  /**
   * 删除指定组件
   * @param component
   */
  removeComponent(component: Component) {
    const parentSlot = component?.parent

    if (parentSlot) {
      const index = parentSlot.indexOf(component)
      this.selection.setBaseAndExtent(parentSlot, index, parentSlot, index + 1)
      return this.delete()
    }
    return false
  }

  private transformByRange(rule: TransformRule, abstractSelection: AbstractSelection, range: Range): boolean {
    const { startSlot, endSlot } = range
    const commonAncestorSlot = Selection.getCommonAncestorSlot(startSlot, endSlot)
    const commonAncestorComponent = Selection.getCommonAncestorComponent(startSlot, endSlot)
    if (!commonAncestorSlot || !commonAncestorComponent) {
      return false
    }
    let stopComponent: Component
    if (commonAncestorSlot.parent !== commonAncestorComponent ||
      (abstractSelection.anchorSlot === commonAncestorSlot && abstractSelection.focusSlot === commonAncestorSlot)) {
      stopComponent = commonAncestorComponent.parentComponent!
    } else {
      stopComponent = commonAncestorComponent
    }

    const parentComponent = endSlot.parent!
    if (parentComponent.separate) {
      if (endSlot !== parentComponent.slots.at(-1)) {
        const slotIndex = parentComponent.slots.indexOf(endSlot)
        const count = parentComponent.slots.length - slotIndex
        const deletedSlots = parentComponent.slots.splice(slotIndex + 1, slotIndex + count)
        const afterComponent = parentComponent.separate(deletedSlots[0], deletedSlots[deletedSlots.length - 1])
        this.insertAfter(afterComponent!, parentComponent)
      }
    }

    const slotRanges = Selection.getSelectedScopes(range)
    this.transformByNormalizedRanges(slotRanges, rule, abstractSelection, stopComponent)
    return true
  }

  private transformByNormalizedRanges(slotRanges: SlotRange[],
                                      rule: TransformRule,
                                      abstractSelection: AbstractSelection,
                                      stopComponent: Component<any>) {
    let convertedData: Array<Component<any> | Slot> = []
    let prevHost: Slot | null = null
    const startSlot = this.selection.startSlot
    this.selection.transaction(() => {
      while (slotRanges.length) {
        const slotRange = slotRanges.pop()!
        const startIndex = Selection.getInlineContentStartIndex(slotRange.slot, slotRange.startIndex)
        const endIndex = Selection.getInlineContentEndIndex(slotRange.slot, slotRange.endIndex)

        const deletedDelta = this.cutContent(slotRange.slot, startIndex, endIndex)
        let focusSlot: Slot
        let focusOffset: number
        if (slotRange.slot.isEmpty) {
          let position = deleteUpBySlot(this.selection, slotRange.slot, startIndex, stopComponent, true, slot => {
            if (slot === prevHost) {
              return false
            }
            return typeof slot.parent?.removeSlot === 'function'
          })
          // 多插件组件不能原位插入最新内容，这时尝试回退到当前组件的后面
          if (!position.slot.schema.includes(rule.targetType)) {
            const parentComponent = position.slot.parent
            const parentSlot = parentComponent?.parent
            if (parentSlot) {
              const index = parentSlot.indexOf(parentComponent)!
              position = {
                slot: parentSlot,
                offset: index + 1
              }
            }
          }
          focusSlot = position.slot
          focusOffset = position.offset
        } else {
          focusSlot = slotRange.slot
          focusOffset = startIndex
        }
        if (focusSlot !== prevHost) {
          this.flushTransformedData(convertedData, rule)
          convertedData = []
        }
        prevHost = focusSlot
        this.selection.setPosition(focusSlot, focusOffset)
        const subData = this.transformByDelta(slotRange,
          deletedDelta,
          rule,
          abstractSelection,
          slotRange.slot,
          slotRange.slot === startSlot ? startIndex : 0)
        convertedData = [...subData, ...convertedData]
      }
      this.flushTransformedData(convertedData, rule)
    })
  }

  private flushTransformedData(data: Array<Slot | Component<any>>, rule: TransformRule) {
    for (let i = 0; i < data.length; i++) {
      const item = data[i]
      if (item instanceof Slot) {
        const slots = [item]
        i++
        while (i < data.length) {
          const next = data[i]
          if (next instanceof Slot) {
            slots.push(next)
            i++
          } else {
            i--
            break
          }
        }
        const components = rule.stateFactory(slots, this.textbus)
        components.forEach(component => {
          this.insert(component)
        })
      } else {
        this.insert(item)
      }
    }
  }

  private transformByDelta(slotRange: SlotRange,
                           deletedDelta: DeltaLite,
                           rule: TransformRule,
                           abstractSelection: AbstractSelection,
                           src: Slot,
                           startIndex: number) {

    const computedAnchorOffset = abstractSelection.anchorOffset - startIndex
    const computedFocusOffset = abstractSelection.focusOffset - startIndex

    return this.deltaToData(deletedDelta,
      rule,
      slotRange.slot.parent!,
      src,
      (slot, src, index, itemLength, offset) => {
        const newAnchorOffset = computedAnchorOffset - offset
        const newFocusOffset = computedFocusOffset - offset
        if (src === abstractSelection.anchorSlot &&
          (newAnchorOffset > index && newAnchorOffset <= index + itemLength || newAnchorOffset === 0)) {
          abstractSelection.anchorOffset = newAnchorOffset
          abstractSelection.anchorSlot = slot
        }
        if (src === abstractSelection.focusSlot &&
          (newFocusOffset > index && newFocusOffset <= index + itemLength || newFocusOffset === 0)) {
          abstractSelection.focusOffset = newFocusOffset
          abstractSelection.focusSlot = slot
        }
      }
    )
  }

  private deltaToData(delta: DeltaLite,
                      rule: TransformRule,
                      from: Component<any>,
                      srcSlot: Slot,
                      syncSelection: (slot: Slot, src: Slot, index: number, itemLength: number, offset: number) => void) {
    const convertedData: Array<Component<any> | Slot> = []
    let slot = rule.slotFactory(from)

    let inserted = false

    let index = 0
    let offset = 0
    for (const item of delta) {
      if (canInsert(item.insert, slot)) {
        if (!inserted) {
          convertedData.push(slot)
          delta.attributes.forEach((value, key) => {
            slot!.setAttribute(key, value)
          })
          inserted = true
        }

        slot.insert(item.insert, item.formats)
        syncSelection(slot, srcSlot, index, item.insert.length, offset)
        index += item.insert.length
      } else {
        if (item.insert instanceof Component) {
          // TODO: 这里组件携带的样式没有处理
          const subConvertedData = this.transformChildComponent(item.insert, rule, syncSelection)
          convertedData.push(...subConvertedData)
          slot = rule.slotFactory(from)
          inserted = false
          index++
          offset = index
        } else {
          throw commanderErrorFn('transform slot cannot insert text!')
        }
      }
    }
    return convertedData
  }

  private transformChildComponent(component: Component<any>,
                                  rule: TransformRule,
                                  syncSelection: (slot: Slot, src: Slot, index: number, itemLength: number, offset: number) => void) {
    const slots = component.slots
    if (slots.length === 0) {
      return [component]
    }
    const convertedData: Array<Component<any> | Slot> = []
    for (const slot of slots) {
      const subConvertedData = this.deltaToData(slot.toDelta(), rule, component, slot, syncSelection)
      convertedData.push(...subConvertedData)
    }
    return convertedData
  }

  private cutContent(slot: Slot, startIndex: number, endIndex: number) {
    const deletedSlot = slot.cut(startIndex, endIndex)
    const deletedEvent = new Event(slot, null)
    invokeListener(slot.parent!, 'onContentDeleted', deletedEvent)
    return deletedSlot.toDelta()
  }
}
