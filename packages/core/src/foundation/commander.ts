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
  invokeListener,
  Slot,
  SlotRange
} from '../model/_api'
import { RootComponentRef } from './_injection-tokens'
import { Registry } from './registry'
import { Textbus } from '../textbus'
import { Adapter } from './adapter'

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
    if (firstComponent && firstComponent.__slots__.length) {
      return {
        slot: firstComponent.__slots__.first,
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
                        rootComponent: Component,
                        deleteBefore: boolean): SelectionPosition {
  const parentComponent = slot.parent
  if (!parentComponent) {
    return {
      slot,
      offset
    }
  }
  const parentSlot = parentComponent.parent!
  if (!parentSlot) {
    return {
      slot,
      offset
    }
  }
  const index = parentSlot.indexOf(parentComponent)

  // 单插槽组件
  if (parentComponent.__slots__.length === 1) {
    if (parentComponent === rootComponent) {
      return {
        slot,
        offset
      }
    }

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
      return deleteUpBySlot(selection, parentSlot, index, rootComponent, deleteBefore)
    }
    return {
      slot: parentSlot,
      offset: parentSlot.index
    }
  }
  // 多插槽组件
  const slotIndex = parentComponent.__slots__.indexOf(slot)
  const position: SelectionPosition = slotIndex === 0 ? {
    slot: parentSlot,
    offset: index
  } : selection.findLastPosition(parentComponent.__slots__.get(slotIndex - 1)!, true)

  if (parentComponent.removeSlot?.(slot)) {
    parentComponent.__slots__.splice(slotIndex, 1)
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

function deltaToSlots(selection: Selection,
                      source: Slot,
                      delta: DeltaLite,
                      rule: TransformRule,
                      abstractSelection: AbstractSelection,
                      offset: number): Slot[] {
  const parentComponent = source.parent!
  let newSlot = rule.slotFactory(parentComponent)
  delta.attributes.forEach((value, key) => {
    newSlot.setAttribute(key, value)
  })
  const newSlots = [newSlot]

  let index = 0
  while (delta.length) {
    const { insert, formats } = delta.shift()!
    const b = canInsert(insert, newSlot)
    const oldIndex = index
    index += insert.length
    if (b) {
      newSlot.insert(insert, formats)
      if (source === abstractSelection.anchorSlot &&
        abstractSelection.anchorOffset - offset >= oldIndex &&
        abstractSelection.anchorOffset - offset <= index) {
        abstractSelection.anchorSlot = newSlot
        abstractSelection.anchorOffset -= offset
      }
      if (source === abstractSelection.focusSlot &&
        abstractSelection.focusOffset - offset >= oldIndex &&
        abstractSelection.focusOffset - offset <= index) {
        abstractSelection.focusSlot = newSlot
        abstractSelection.focusOffset -= offset
      }
      continue
    }
    if (abstractSelection.anchorOffset > index) {
      abstractSelection.anchorOffset -= index
    }
    if (abstractSelection.focusOffset > index) {
      abstractSelection.focusOffset -= index
    }
    if (typeof insert !== 'string') {
      const slots = insert.__slots__.map(childSlot => {
        return deltaToSlots(selection, source, childSlot.toDelta(), rule, abstractSelection, offset)
      }).flat()
      newSlots.push(...slots)
    }
    newSlot = rule.slotFactory(parentComponent)
    delta.attributes.forEach((value, key) => {
      newSlot.setAttribute(key, value)
    })
  }
  return newSlots
}

function slotsToComponents(textbus: Textbus, slots: Slot[], rule: TransformRule) {
  const componentInstances: Component[] = []
  if (!slots.length) {
    return componentInstances
  }
  componentInstances.push(...rule.stateFactory(slots, textbus))
  return componentInstances
}

function getBlockRangeToBegin(slot: Slot, offset: number): SlotRange {
  let startIndex = offset
  const content = slot.sliceContent(0, offset)
  while (content.length) {
    const item = content.pop()!
    if (typeof item !== 'string' && item.type === ContentType.BlockComponent) {
      break
    }
    startIndex -= item.length
  }
  return {
    slot,
    startIndex,
    endIndex: offset
  }
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
    if (!is) {
      return false
    }

    const position: SelectionPosition = {
      slot: selection.startSlot!,
      offset: selection.startOffset!
    }

    let formats: Formats = []
    if (canInsert(content, position.slot)) {
      const nextFormats = position.slot.extractFormatsByIndex(position.offset + 1)
      formats = position.slot.extractFormatsByIndex(position.offset).filter(i => {
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
        if (startOffset === 0) {
          isDeleteRanges = false
        }
        const prevPosition = selection.getPreviousPosition()!
        startSlot = prevPosition.slot
        startOffset = prevPosition.offset
      } else {
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
          const index = parentComponent.__slots__.indexOf(commonAncestorSlot)
          const nextSlot = parentComponent.__slots__.get(index + 1)
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
        currentContent.__slots__.length > 0) {
        selection.toNext()
      }
    }
    return !event.isPrevented
  }

  /**
   * 清除当前选区的所有格式
   * @param excludeFormatters 在清除格式时，排除的格式
   */
  cleanFormats(excludeFormatters: Formatter<any>[] | ((formatter: Formatter<any>) => boolean) = []) {
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
      slot.cleanFormats(excludeFormatters, scope.startIndex, scope.endIndex)
    })
  }

  /**
   * 给当前选区应用新的格式
   * @param formatter 要应用的格式
   * @param value 当前格式要应用的值
   */
  applyFormat<T extends FormatValue>(formatter: Formatter<T>, value: T) {
    if (this.selection.isCollapsed) {
      const slot = this.selection.commonAncestorSlot!
      if (slot.isEmpty) {
        slot.retain(0)
        slot.retain(slot.length, formatter, value)
      } else {
        this.write(Slot.placeholder)
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
  unApplyFormat(formatter: Formatter<any>) {
    if (this.selection.isCollapsed) {
      const slot = this.selection.commonAncestorSlot!
      if (slot.isEmpty) {
        slot.retain(0)
        slot.retain(slot.length, formatter, null)
      } else {
        const startOffset = this.selection.startOffset!
        const prevContent = slot.getContentAtIndex(startOffset - 1)
        if (prevContent === Slot.placeholder) {
          slot.retain(startOffset - 1)
          slot.retain(1, formatter, null)
        } else {
          this.write(Slot.placeholder)
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
   * 根据选区应用插槽属性
   * @param attribute
   * @param value
   */
  applyAttribute<T extends FormatValue>(attribute: Attribute<T>, value: T) {
    if (this.selection.isCollapsed) {
      const slot = this.selection.commonAncestorSlot!
      slot.setAttribute(attribute, value)
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
        i.slot.setAttribute(attribute, value)
      } else {
        childComponents.forEach(i => {
          i.__slots__.forEach(slot => {
            slot.setAttribute(attribute, value)
          })
        })
      }
    })
  }

  /**
   * 根据选区清除插槽属性
   * @param attribute
   */
  unApplyAttribute(attribute: Attribute<any>) {
    if (this.selection.isCollapsed) {
      const slot = this.selection.commonAncestorSlot!
      slot.removeAttribute(attribute)
      return
    }
    this.selection.getSelectedScopes().forEach(i => {
      const contents = i.slot.sliceContent(i.startIndex, i.endIndex)
      const childComponents: Component[] = []
      let hasString = false
      contents.forEach(item => {
        if (typeof item !== 'string') {
          childComponents.push(item)
        } else {
          hasString = true
        }
      })
      if (hasString) {
        i.slot.removeAttribute(attribute)
      } else {
        childComponents.forEach(i => {
          i.__slots__.forEach(slot => {
            slot.removeAttribute(attribute)
          })
        })
      }
    })
  }

  /**
   * 根据选区清除属性
   */
  cleanAttributes(excludeAttributes: Attribute<any>[] | ((attribute: Attribute<any>) => boolean) = []) {
    this.selection.getSelectedScopes().forEach(i => {
      const contents = i.slot.sliceContent(i.startIndex, i.endIndex)
      const childComponents: Component[] = []
      let hasString = false
      contents.forEach(item => {
        if (typeof item !== 'string') {
          childComponents.push(item)
        } else {
          hasString = true
        }
      })
      if (hasString) {
        i.slot.cleanAttributes(excludeAttributes)
      } else {
        childComponents.forEach(i => {
          i.__slots__.forEach(slot => {
            slot.cleanAttributes(excludeAttributes)
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
    const { startSlot, startOffset, endSlot, endOffset } = range
    const selection = this.selection
    const commonAncestorSlot = Selection.getCommonAncestorSlot(startSlot, endSlot)
    const commonAncestorComponent = Selection.getCommonAncestorComponent(startSlot, endSlot)
    if (!commonAncestorSlot || !commonAncestorComponent) {
      return false
    }
    let stoppedComponent: Component
    if (commonAncestorSlot.parent !== commonAncestorComponent ||
      (abstractSelection.anchorSlot === commonAncestorSlot && abstractSelection.focusSlot === commonAncestorSlot)) {
      stoppedComponent = commonAncestorComponent.parentComponent!
    } else {
      stoppedComponent = commonAncestorComponent
    }

    const stoppedScope = {
      slot: startSlot,
      offset: Selection.getInlineContentStartIndex(startSlot, startOffset)
    }
    let startScope = {
      slot: endSlot,
      offset: Selection.getInlineContentEndIndex(endSlot, endOffset)
    }

    const parentComponent = startScope.slot.parent!
    if (parentComponent.separate) {
      if (startScope.slot !== parentComponent.__slots__.last) {
        const slotIndex = parentComponent.__slots__.indexOf(startScope.slot)
        const count = parentComponent.__slots__.length - slotIndex
        const deletedSlots = parentComponent.__slots__.splice(slotIndex + 1, slotIndex + count)
        const afterComponent = parentComponent.separate(deletedSlots[0], deletedSlots[deletedSlots.length - 1])
        this.insertAfter(afterComponent!, parentComponent)
      }
    }

    let slots: Slot[] = []
    let position: SelectionPosition | null = null
    while (true) {
      const endPaths = selection.getPathsBySlot(startScope.slot)
      if (!endPaths) {
        break
      }
      endPaths.push(startScope.offset)
      const startPaths = selection.getPathsBySlot(stoppedScope.slot)
      if (!startPaths) {
        break
      }
      startPaths.push(stoppedScope.offset)
      if (!Selection.compareSelectionPaths(startPaths, endPaths)) {
        break
      }
      const scope: SlotRange = startScope.slot.isEmpty ? {
        slot: startScope.slot,
        startIndex: 0,
        endIndex: 0
      } : getBlockRangeToBegin(startScope.slot, startScope.offset)

      const { slot, startIndex, endIndex } = scope
      const parentComponent = slot.parent!

      if (!parentComponent.separate && parentComponent.__slots__.length > 1 && !slot.schema.includes(rule.targetType)) {
        // 无法转换的情况
        const componentInstances = slotsToComponents(this.textbus, slots, rule)
        componentInstances.forEach(instance => {
          this.insert(instance)
        })
        slots = []
        startScope = selection.getPreviousPositionByPosition(slot, 0)
        position = null
        continue
      }
      selection.setBaseAndExtent(slot, startIndex, slot, endIndex)
      if (slot.isEmpty) {
        startScope = selection.getPreviousPositionByPosition(slot, 0)
        if (startScope.slot === slot && startScope.offset === startIndex) {
          if (position) {
            selection.setPosition(position.slot, position.offset)
          }
          break
        }
        if (parentComponent.separate || parentComponent.__slots__.length === 1) {
          const delta = slot.toDelta()
          slots.unshift(...deltaToSlots(selection, slot, delta, rule, abstractSelection, 0))
          position = deleteUpBySlot(selection, slot, 0, stoppedComponent, false)
        } else {
          const componentInstances = slotsToComponents(this.textbus, slots, rule)
          slots = []
          selection.selectComponentEnd(parentComponent)
          componentInstances.forEach(instance => {
            this.insert(instance)
          })
          position = null
        }
      } else {
        startScope = selection.getPreviousPositionByPosition(slot, startIndex)
        if (startScope.slot === slot && startScope.offset === startIndex) {
          if (position) {
            selection.setPosition(position.slot, position.offset)
          }
          break
        }
        if (startIndex === endIndex) {
          const componentInstances = slotsToComponents(this.textbus, slots, rule)
          slots = []
          componentInstances.forEach(instance => {
            this.insert(instance)
          })
          continue
        }
        this.delete(deletedSlot => {
          if (parentComponent.separate || parentComponent.__slots__.length === 1) {
            const delta = deletedSlot.toDelta()
            slots.unshift(...deltaToSlots(selection, slot, delta, rule, abstractSelection, startIndex))
            if (startIndex > 0) {
              startScope = selection.getPreviousPositionByPosition(slot, startIndex)
              position = {
                slot,
                offset: startIndex
              }
              return
            }
            position = deleteUpBySlot(selection, slot, 0, stoppedComponent, false)
            return
          }

          position = null
          let componentInstances = slotsToComponents(this.textbus, slots, rule)
          slots = []
          selection.selectComponentEnd(parentComponent)
          componentInstances.forEach(instance => {
            this.insert(instance)
          })

          const delta = deletedSlot.toDelta()
          const dumpSlots = deltaToSlots(selection, slot, delta, rule, abstractSelection, startIndex)

          componentInstances = slotsToComponents(this.textbus, dumpSlots, rule)

          componentInstances.forEach((instance, index) => {
            selection.setPosition(slot, index + startIndex)
            this.insert(instance)
          })
          if (startIndex > 0) {
            startScope = selection.getPreviousPositionByPosition(slot, startIndex)
            position = {
              slot,
              offset: startIndex
            }
          }
        })
      }
      if (position!) {
        selection.setPosition(position.slot, position.offset)
      }
      if (scope.slot === stoppedScope.slot && scope.endIndex === stoppedScope.offset) {
        break
      }
    }

    const componentInstances = slotsToComponents(this.textbus, slots, rule)
    componentInstances.forEach(instance => {
      this.insert(instance)
    })
    return true
  }
}
