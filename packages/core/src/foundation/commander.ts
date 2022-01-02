import { Injectable } from '@tanbo/di'

import { SelectionLocation, TBSelection } from './selection'
import { ComponentInstance, Formatter, FormatType, FormatValue, placeholder, Slot } from '../model/_api'
import { NativeRenderer } from './_injection-tokens'
import {
  DeleteEventData,
  EnterEventData,
  InsertEventData,
  invokeListener,
  TBEvent
} from '../define-component'

interface DeleteTreeState extends SelectionLocation {
  success: boolean
}

@Injectable()
export class Commander {
  constructor(private selection: TBSelection,
              private nativeRenderer: NativeRenderer) {
  }

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
      invokeListener(result.parent!, 'onInserted', new TBEvent<InsertEventData>(result, {
        index: result.index,
        content
      }, () => {
        //
      }))
      return true
    }
    return false
  }

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
    const event = new TBEvent<EnterEventData>(startSlot, {
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
      const event = new TBEvent<DeleteEventData>(slot, {
        count: selection.endOffset! - selection.startOffset!,
        index: selection.endOffset!,
        isMove: false,
        isStart: true,
        isEnd: true
      }, () => {
        isPreventDefault = false
        slot.retain(selection.endOffset!)
        slot.delete(selection.endOffset! - selection.startOffset!)
        selection.collapse()
      })
      invokeListener(selection.startSlot!.parent!, 'onDelete', event)
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
      const event = new TBEvent<DeleteEventData>(endSlot, {
        isEnd: true,
        isStart: false,
        isMove: true,
        index: endSlot.length,
        count: endSlot.length - selection.endOffset!
      }, () => {
        deletedSlot = endSlot.cut(selection.endOffset!, endSlot.length)
      })
      invokeListener(endSlot.parent!, 'onDelete', event)
    }

    // 删除选中的区域
    const scopes = selection.getSelectedScopes().map(i => {
      return {
        ...i,
        isStart: false,
        isEnd: false
      }
    })
    const firstScope = scopes[0]
    const lastScope = scopes[scopes.length - 1]
    if (firstScope && firstScope.slot === selection.startSlot) {
      firstScope.isStart = true
    }
    if (selection.endOffset === 0) {
      scopes.push({
        slot: endSlot,
        startIndex: 0,
        endIndex: endSlot.length,
        isStart: false,
        isEnd: true
      })
    } else {
      if (lastScope) {
        lastScope.isEnd = true
      }
    }

    const commonAncestorSlotRef = selection.commonAncestorSlot!

    while (scopes.length) {
      const scope = scopes.pop()!
      let stoppedSlot = scope.slot
      const slot = scope.slot

      let isPreventDefault = true
      const event = new TBEvent<DeleteEventData>(slot, {
        count: scope.endIndex - scope.startIndex,
        index: scope.endIndex,
        isMove: false,
        isStart: scope.isStart,
        isEnd: scope.isEnd,
      }, () => {
        isPreventDefault = false
      })
      const parentComponent = scope.slot.parent!
      invokeListener(parentComponent, 'onDelete', event)
      if (isPreventDefault) {
        const index = stoppedSlot.index
        if (deletedSlot) {
          this._addContent(deletedSlot, stoppedSlot)
        }
        selection.setEnd(stoppedSlot, index)
        return false
      } else {
        slot.retain(scope.endIndex)
        slot.delete(scope.endIndex - scope.startIndex)
        if (scope.isStart) {
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

            slot.retain(scope.endIndex)
            slot.delete(scope.endIndex - scope.startIndex)
            return false
          }
        } else {
          let isPreventDefault = true
          const event = new TBEvent<null>(slot, null, () => {
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

  copy() {
    this.nativeRenderer.copy()
  }

  cut() {
    if (this.selection.isCollapsed) {
      return
    }
    this.copy()
    this.delete()
  }

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
    invokeListener(component, 'onPaste', new TBEvent(slot, {
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
        slot.retain(scope.endIndex, i.formatter, null)
      })
    })
  }

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
        slot.retain(startOffset, formatter, value)
      }
      return
    }
    this.selection.getSelectedScopes().forEach(i => {
      i.slot.retain(i.startIndex)
      i.slot.retain(i.endIndex, formatter, value)
    })
  }

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
          slot.retain(startOffset, formatter, null)
        } else {
          this.insert(placeholder)
          slot.retain(startOffset)
          slot.retain(startOffset + 1, formatter, null)
        }
      }
      return
    }
    this.selection.getSelectedScopes().forEach(i => {
      i.slot.retain(i.startIndex)
      i.slot.retain(i.endIndex, formatter, null)
    })
  }

  insertBefore(component: ComponentInstance, ref: ComponentInstance) {
    const parentSlot = ref?.parent

    if (parentSlot) {
      const index = parentSlot.indexOf(ref)
      parentSlot.retain(index)
      parentSlot.insert(component)
    }
  }

  insertAfter(component: ComponentInstance, ref: ComponentInstance) {
    const parentSlot = ref?.parent

    if (parentSlot) {
      const index = parentSlot.indexOf(ref)
      parentSlot.retain(index + 1)
      parentSlot.insert(component)
    }
  }

  replace(source: ComponentInstance, target: ComponentInstance) {
    this.insertBefore(target, source)
    this.remove(source)
  }

  remove(component: ComponentInstance) {
    const parentSlot = component?.parent

    if (parentSlot) {
      const index = parentSlot.indexOf(component)
      parentSlot.retain(index + 1)
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
            targetSlot.retain(startIndex + i.endIndex, i.formatter, i.value)
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
    const event = new TBEvent<InsertEventData>(target, {
      index: this.selection.startOffset!,
      content
    }, () => {
      isPreventDefault = false
    })
    invokeListener(target.parent!, 'onInsert', event)
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
      const event = new TBEvent<DeleteEventData>(parentSlot, {
        count: 1,
        index: index + 1,
        isStart: false,
        isEnd: true,
        isMove: false
      }, () => {
        isPreventDefault = false
      })
      invokeListener(parentSlot.parent!, 'onDelete', event)
      if (!isPreventDefault) {
        parentSlot.retain(index + 1)
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
          const event = new TBEvent<null>(parentSlot, null, () => {
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
