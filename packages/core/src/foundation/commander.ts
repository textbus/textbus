import { Injectable, Injector, Prop } from '@tanbo/di'

import { SelectionPosition, Selection, Range } from './selection'
import {
  ComponentInstance,
  ContentType,
  DeleteEventData,
  Formatter,
  FormatType,
  FormatValue,
  invokeListener,
  Slot,
  Event,
  InsertEventData,
  EnterEventData,
  Formats,
  Component,
  DeltaLite
} from '../model/_api'
import { NativeRenderer, RootComponentRef } from './_injection-tokens'
import { Translator } from './translator'

function getInsertPosition(
  slot: Slot,
  offset: number,
  content: string | ComponentInstance,
  excludeSlots: Slot[] = []
): SelectionPosition | null {
  if (canInsert(content, slot)) {
    return {
      slot,
      offset
    }
  }
  excludeSlots.push(slot)
  return getNextInsertPosition(slot, content, excludeSlots)
}

function canInsert(content: string | ComponentInstance, target: Slot) {
  const insertType = typeof content === 'string' ? ContentType.Text : content.type
  return target.schema.includes(insertType)
}

function getNextInsertPosition(currentSlot: Slot, content: string | ComponentInstance, excludeSlots: Slot[]): SelectionPosition | null {
  const parentComponent = currentSlot.parent!
  const slotIndex = parentComponent.slots.indexOf(currentSlot)
  if (currentSlot !== parentComponent.slots.last) {
    return getInsertPosition(parentComponent.slots.get(slotIndex + 1)!, 0, content, excludeSlots)
  }
  const parentSlot = parentComponent.parent
  if (!parentSlot) {
    return null
  }
  if (excludeSlots.includes(parentSlot)) {
    return getNextInsertPosition(parentSlot, content, excludeSlots)
  }
  const index = parentSlot.indexOf(parentComponent)
  const position = getInsertPosition(parentSlot, index + 1, content, excludeSlots)
  if (position) {
    return position
  }
  excludeSlots.push(parentSlot)

  const afterContent = parentSlot.sliceContent(index + 1)
  const firstComponent = afterContent.filter((i): i is ComponentInstance => {
    return typeof i !== 'string'
  }).shift()

  if (firstComponent && firstComponent.slots.length) {
    return getInsertPosition(firstComponent.slots.get(0)!, 0, content, excludeSlots)
  }

  return getNextInsertPosition(parentSlot, content, excludeSlots)
}

function deleteUpBySlot(selection: Selection, slot: Slot, offset: number, rootComponent: ComponentInstance): SelectionPosition {
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
  if (parentComponent.slots.length === 1) {
    if (parentComponent === rootComponent) {
      return {
        slot,
        offset
      }
    }

    let isPreventDefault = true
    invokeListener(parentSlot.parent!, 'onContentDelete', new Event<Slot, DeleteEventData>(parentSlot, {
      index,
      count: 1
    }, () => {
      isPreventDefault = false
      parentSlot.retain(index)
      parentSlot.delete(1)
      invokeListener(parentSlot.parent!, 'onContentDeleted')
    }))
    if (isPreventDefault) {
      return {
        slot,
        offset
      }
    }
    if (parentSlot.isEmpty) {
      return deleteUpBySlot(selection, parentSlot, index, rootComponent)
    }
    return {
      slot: parentSlot,
      offset: parentSlot.index
    }
  }
  // 多插槽组件
  const slotIndex = parentComponent.slots.indexOf(slot)
  const position: SelectionPosition = slotIndex === 0 ? {
    slot: parentSlot,
    offset: index
  } : selection.findLastPosition(parentComponent.slots.get(slotIndex - 1)!, true)

  let isPreventDefault = true
  invokeListener(parentComponent, 'onSlotRemove', new Event<ComponentInstance, DeleteEventData>(parentComponent, {
    index: slotIndex,
    count: 1
  }, () => {
    isPreventDefault = false
    const isSuccess = parentComponent.slots.remove(slot)
    if (isSuccess) {
      invokeListener(parentComponent, 'onSlotRemoved')
    }
  }))
  if (!isPreventDefault) {
    return position
  }
  return {
    slot,
    offset
  }
}

export interface TransformRule<ComponentState, SlotState> {
  multipleSlot: boolean
  target: Component

  slotFactory(): Slot<SlotState>

  stateFactory?(): ComponentState
}

function deltaToSlots<T>(selection: Selection, source: Slot, delta: DeltaLite, rule: TransformRule<any, T>, range: Range): Slot<T>[] {
  let newSlot = rule.slotFactory()
  const newSlots = [newSlot]

  let index = 0
  while (delta.length) {
    const {insert, formats} = delta.shift()!
    const b = canInsert(insert, newSlot)
    const oldIndex = index
    index += insert.length
    if (b) {
      newSlot.insert(insert, formats)
      if (source === range.anchorSlot && range.anchorOffset >= oldIndex && range.anchorOffset <= index) {
        range.anchorSlot = newSlot
      }
      if (source === range.focusSlot && range.focusOffset >= oldIndex && range.focusOffset <= index) {
        range.focusSlot = newSlot
      }
      continue
    }
    if (range.anchorOffset > index) {
      range.anchorOffset -= index
    }
    if (range.focusOffset > index) {
      range.focusOffset -= index
    }
    if (typeof insert !== 'string') {
      const slots = insert.slots.toArray().map(childSlot => {
        return deltaToSlots(selection, source, childSlot.toDelta(), rule, range)
      }).flat()
      newSlots.push(...slots)
    }
    newSlot = rule.slotFactory()
  }
  return newSlots
}

function slotsToComponents<T>(injector: Injector, slots: Slot<T>[], rule: TransformRule<any, T>) {
  const componentInstances: ComponentInstance[] = []
  if (rule.multipleSlot) {
    componentInstances.push(rule.target.createInstance(injector, {
      state: rule.stateFactory?.(),
      slots
    }))
  } else {
    slots.forEach(childSlot => {
      componentInstances.push(rule.target.createInstance(injector, {
        state: rule.stateFactory?.(),
        slots: [childSlot]
      }))
    })
  }
  return componentInstances
}

@Injectable()
export class Commander {
  @Prop()
  private nativeRenderer!: NativeRenderer

  constructor(protected selection: Selection,
              protected injector: Injector,
              protected translator: Translator,
              protected rootComponentRef: RootComponentRef) {
  }

  /**
   * 将选区内容转换为指定组件
   * @param rule
   */
  transform<T, U>(rule: TransformRule<T, U>): boolean {
    const selection = this.selection
    if (!selection.isSelected) {
      return false
    }

    const range: Range = {
      anchorSlot: selection.anchorSlot!,
      anchorOffset: selection.anchorOffset!,
      focusSlot: selection.focusSlot!,
      focusOffset: selection.focusOffset!
    }

    const scopes = selection.getBlocks()

    let slots: Slot<U>[] = []

    for (const scope of scopes) {
      const {slot, startIndex, endIndex} = scope
      const parentComponent = slot.parent!
      if (parentComponent.separable) {
        const slotIndex = parentComponent.slots.indexOf(slot)
        if (slotIndex !== 0) {
          invokeListener(parentComponent, 'onSlotRemove', new Event(parentComponent, {
            index: 0,
            count: slotIndex
          }, () => {
            parentComponent.slots.retain(0)
            const deletedSlots = parentComponent.slots.delete(slotIndex)
            const beforeComponent = this.translator.createComponentByData(parentComponent.name, {
              state: typeof parentComponent.state === 'object' ? JSON.parse(JSON.stringify(parentComponent.state)) : parentComponent.state,
              slots: deletedSlots
            })
            this.insertBefore(beforeComponent!, parentComponent)
          }))
        }
      }
      selection.setBaseAndExtent(slot, startIndex, slot, endIndex)
      let position: SelectionPosition | null
      if (slot.isEmpty) {
        const delta = slot.toDelta()
        slots.push(...deltaToSlots(selection, slot, delta, rule, range))
        position = deleteUpBySlot(selection, slot, 0, this.rootComponentRef.component)
      } else {
        this.delete(deletedSlot => {
          position = null
          const parentComponent = slot.parent!
          if (parentComponent.separable || parentComponent.slots.length === 1) {
            const delta = deletedSlot.toDelta()
            slots.push(...deltaToSlots(selection, slot, delta, rule, range))
            position = deleteUpBySlot(selection, slot, 0, this.rootComponentRef.component)
            return
          }
          let componentInstances = slotsToComponents(this.injector, slots, rule)
          slots = []
          componentInstances.forEach(instance => {
            this.insertBefore(instance, parentComponent)
          })
          if (!slot.schema.includes(rule.target.instanceType)) {
            return
          }
          const delta = deletedSlot.toDelta()
          const dumpSlots = deltaToSlots(selection, slot, delta, rule, range)

          componentInstances = slotsToComponents(this.injector, dumpSlots, rule)

          componentInstances.forEach((instance, index) => {
            selection.setPosition(slot, index)
            this.insert(instance)
          })
        })
      }
      if (position!) {
        selection.setPosition(position.slot, position.offset)
      }
    }
    const componentInstances = slotsToComponents(this.injector, slots, rule)
    componentInstances.forEach(instance => {
      this.insert(instance)
    })
    selection.setBaseAndExtent(range.anchorSlot, range.anchorOffset, range.focusSlot, range.focusOffset)
    return true
  }

  /**
   * 在当前选区插入新内容，当选区未闭合时，会先删除选区内容，再插入新的内容
   * 在插入新内容时，write 方法还会把相邻的样式应用到新内容上
   * @param content 新插入的内容
   * @param formats 新的格式
   */
  write(content: string | ComponentInstance, formats?: Formats): boolean
  write(content: string | ComponentInstance, formatter?: Formatter, value?: FormatValue): boolean
  write(content: string | ComponentInstance, formatter?: Formatter | Formats, value?: FormatValue): boolean {
    const selection = this.selection
    const canInsert = selection.isCollapsed ? true : this.delete()
    if (!canInsert) {
      return false
    }
    const position = getInsertPosition(selection.startSlot!, selection.startOffset!, content)
    if (!position) {
      return false
    }
    let formats = position.slot.extractFormatsByIndex(position.offset)
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
  insert(content: string | ComponentInstance, formats?: Formats): boolean
  insert(content: string | ComponentInstance, formatter?: Formatter, value?: FormatValue): boolean
  insert(content: string | ComponentInstance, formatter?: Formatter | Formats, value?: FormatValue): boolean {
    const selection = this.selection
    const canInsert = selection.isCollapsed ? true : this.delete()
    if (!canInsert) {
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

    const position = getInsertPosition(selection.startSlot!, selection.startOffset!, content)
    if (!position) {
      return false
    }
    const {slot, offset} = position
    let isInsertSuccess = false
    invokeListener(slot.parent!, 'onContentInsert', new Event<Slot, InsertEventData>(slot, {
      index: offset,
      content,
      formats
    }, () => {
      isInsertSuccess = true
      slot.retain(offset)
      slot.insert(content, formats)
      invokeListener(slot.parent!, 'onContentInserted', new Event<Slot, InsertEventData>(slot, {
        index: offset,
        content,
        formats
      }, () => {
        selection.setBaseAndExtent(slot, slot.index, slot, slot.index)
      }))
    }))
    return isInsertSuccess
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
    if (selection.isCollapsed) {
      if (deleteBefore) {
        const prevPosition = selection.getPreviousPosition()!
        selection.setAnchor(prevPosition.slot, prevPosition.offset)
      } else {
        const nextPosition = selection.getNextPosition()!
        selection.setFocus(nextPosition.slot, nextPosition.offset)
      }
    }

    if (selection.isCollapsed) {
      const startSlot = selection.startSlot!
      const startOffset = selection.startOffset!
      if (startSlot!.isEmpty) {
        receiver(startSlot.cut())
        const position = deleteUpBySlot(selection, startSlot, startOffset, this.rootComponentRef.component)
        selection.setBaseAndExtent(position.slot, position.offset, position.slot, position.offset)
        return position.slot !== startSlot || position.offset !== startOffset
      }
      return false
    }
    const scopes = selection.getSelectedScopes()
    const endSlot = selection.endSlot!
    const startSlot = selection.startSlot!
    const startOffset = selection.startOffset!
    while (scopes.length) {
      const lastScope = scopes.pop()!
      let {slot, startIndex} = lastScope
      const endIndex = lastScope.endIndex
      const isFocusEnd = selection.focusSlot === slot && selection.focusOffset === endIndex
      let isPreventDefault = true
      invokeListener(slot.parent!, 'onContentDelete', new Event<Slot, DeleteEventData>(slot, {
        index: startIndex,
        count: endIndex - startIndex
      }, () => {
        isPreventDefault = false
        const deletedSlot = slot.cut(startIndex, endIndex)
        receiver(deletedSlot)
        // slot.retain(startIndex)
        // slot.delete(endIndex - startIndex)
        invokeListener(slot.parent!, 'onContentDeleted')
      }))
      if (isPreventDefault) {
        if (isFocusEnd) {
          selection.setFocus(slot, endIndex)
        } else {
          selection.setAnchor(slot, endIndex)
        }
        return false
      }
      if (slot !== startSlot && slot !== endSlot && slot.isEmpty) {
        const position = deleteUpBySlot(selection, slot, startIndex, this.rootComponentRef.component)
        slot = position.slot
        startIndex = position.offset
      }
      if (isFocusEnd) {
        selection.setFocus(slot, startIndex)
      } else {
        selection.setAnchor(slot, startIndex)
      }
    }
    if (startSlot !== endSlot) {
      invokeListener(endSlot.parent!, 'onContentDelete', new Event<Slot, DeleteEventData>(endSlot, {
        index: 0,
        count: endSlot.length
      }, () => {
        const deletedSlot = endSlot.cut()
        receiver(deletedSlot)
        deleteUpBySlot(selection, endSlot, 0, this.rootComponentRef.component)
        if (deletedSlot.isEmpty) {
          return
        }
        const deletedDelta = deletedSlot.toDelta()
        deletedDelta.forEach(item => {
          startSlot.insert(item.insert, item.formats)
        })
      }))
    }
    selection.setBaseAndExtent(startSlot, startOffset, startSlot, startOffset)
    return true
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
    invokeListener(startSlot.parent!, 'onEnter', new Event<Slot, EnterEventData>(startSlot, {
      index: this.selection.startOffset!
    }, () => {
      isPreventDefault = false
      const startOffset = this.selection.startOffset!
      const isToEnd = startOffset === startSlot.length || startSlot.isEmpty
      const content = isToEnd ? '\n\n' : '\n'
      const isInserted = this.write(content)
      if (isInserted && isToEnd) {
        this.selection.setPosition(startSlot, startOffset + 1)
      }
    }))
    return !isPreventDefault
  }

  /**
   * 在指定组件前插入新的组件
   * @param newChild 要插入的组件
   * @param ref 新组件插入组件位置的引用
   */
  insertBefore(newChild: ComponentInstance, ref: ComponentInstance): boolean {
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
  insertAfter(newChild: ComponentInstance, ref: ComponentInstance): boolean {
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
  replaceComponent(oldComponent: ComponentInstance, newComponent: ComponentInstance): boolean {
    const b = this.insertBefore(newComponent, oldComponent)
    if (b) {
      this.selection.setFocus(this.selection.focusSlot!, this.selection.focusOffset! + 1)
      return this.delete(false)
    }
    return false
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
    if (!this.selection.isSelected) {
      return false
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
      const delta = pasteSlot.toDelta()
      delta.forEach(action => {
        this.insert(action.insert, action.formats)
      })
    }))
    return !isPreventDefault
  }

  /**
   * 清除当前选区的所有格式
   * @param excludeFormatters 在清除格式时，排除的格式
   */
  cleanFormats(excludeFormatters: Formatter[] = []) {
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

      function cleanFormats(slot: Slot, excludeFormatters: Formatter[], startIndex: number, endIndex: number) {
        slot.cleanFormats(excludeFormatters, startIndex, endIndex)

        slot.sliceContent(startIndex, endIndex).forEach(child => {
          if (typeof child !== 'string') {
            child.slots.toArray().forEach(childSlot => {
              cleanFormats(childSlot, excludeFormatters, 0, childSlot.length)
            })
          }
        })
      }

      cleanFormats(slot, excludeFormatters, scope.startIndex, scope.endIndex)
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
  unApplyFormat(formatter: Formatter) {
    if (this.selection.isCollapsed) {
      const slot = this.selection.commonAncestorSlot!
      if (formatter.type === FormatType.Block || slot.isEmpty) {
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
   * 删除指定组件
   * @param component
   */
  removeComponent(component: ComponentInstance) {
    const parentSlot = component?.parent

    if (parentSlot) {
      const index = parentSlot.indexOf(component)
      this.selection.setBaseAndExtent(parentSlot, index, parentSlot, index + 1)
      return this.delete()
    }
    return false
  }
}
