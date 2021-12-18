import { Injectable } from '@tanbo/di'
import { distinctUntilChanged, Observable, Subject } from '@tanbo/stream'

import { ComponentInstance, ContentType, Slot } from '../model/_api'
import { Renderer } from './renderer'
import { RootComponentRef } from './_injection-tokens'

export interface TBRange {
  startSlot: Slot
  endSlot: Slot
  startOffset: number
  endOffset: number
}

export interface SelectedScope {
  slot: Slot
  startIndex: number
  endIndex: number
}

export interface SelectedSlotRange {
  startIndex: number
  endIndex: number
  component: ComponentInstance
}

export interface NativeSelectionConnector {
  setSelection(range: TBRange | null): void
}

export interface SelectionLocation {
  slot: Slot
  offset: number
}

export interface CommonAncestorSlotScope {
  startIndex: number
  startSlot: Slot
  startChildComponent: ComponentInstance | null
  endIndex: number
  endSlot: Slot
  endChildComponent: ComponentInstance | null
  startChildSlot: Slot
  endChildSlot: Slot
}

export interface TBRangePosition {
  left: number
  top: number
}

export abstract class NativeSelectionBridge {
  abstract connect(connector: NativeSelectionConnector): void

  abstract restore(range: TBRange | null): void

  abstract getRect(location: SelectionLocation): TBRangePosition | null
}

export interface SelectionPaths {
  start: number[]
  end: number[]
}

export interface TBSelectionMiddleware {
  getSelectedScopes(currentSelectedScope: SelectedScope[]): SelectedScope[]
}

@Injectable()
export class TBSelection {
  onChange: Observable<TBRange | null>

  get isSelected() {
    return ![this.startSlot, this.startOffset, this.endSlot, this.endOffset].includes(null)
  }

  get isCollapsed() {
    return this.isSelected && this.startSlot === this.endSlot && this.startOffset === this.endOffset
  }

  get startSlot() {
    return this._startSlot
  }

  get startOffset() {
    return this._startOffset
  }

  get endSlot() {
    return this._endSlot
  }

  get endOffset() {
    return this._endOffset
  }

  get commonAncestorSlot(): Slot | null {
    let startSlot = this.startSlot
    let endSlot = this.endSlot
    if (startSlot === endSlot) {
      return startSlot
    }

    const startPaths: Slot[] = []
    const endPaths: Slot[] = []

    while (startSlot) {
      startPaths.push(startSlot)
      const parentComponent = startSlot.parent
      if (!parentComponent) {
        break
      }
      startSlot = parentComponent.parent
    }

    while (endSlot) {
      endPaths.push(endSlot)
      const parentComponent = endSlot.parent
      if (!parentComponent) {
        break
      }
      endSlot = parentComponent.parent
    }
    let f: Slot | null = null
    while (startPaths.length && endPaths.length) {
      const s = startPaths.pop()!
      const e = endPaths.pop()!
      if (s === e) {
        f = s
      } else {
        break
      }
    }
    return f
  }

  get commonAncestorComponent(): ComponentInstance | null {
    let startComponent = this.startSlot?.parent
    let endComponent = this.endSlot?.parent
    if (startComponent === endComponent) {
      return startComponent || null
    }
    const startPaths: ComponentInstance[] = []
    const endPaths: ComponentInstance[] = []

    while (startComponent) {
      startPaths.push(startComponent)
      const parentSlot = startComponent.parent
      if (!parentSlot) {
        break
      }
      startComponent = parentSlot.parent
    }

    while (endComponent) {
      endPaths.push(endComponent)
      const parentSlot = endComponent.parent
      if (!parentSlot) {
        break
      }
      endComponent = parentSlot.parent
    }
    let f: ComponentInstance | null = null
    while (startPaths.length && endPaths.length) {
      const s = startPaths.pop()!
      const e = endPaths.pop()!
      if (s === e) {
        f = s
      } else {
        break
      }
    }
    return f
  }

  private _startSlot: Slot | null = null
  private _endSlot: Slot | null = null
  private _startOffset: number | null = null
  private _endOffset: number | null = null
  private changeEvent = new Subject<TBRange | null>()

  private cacheCaretPositionTimer!: any
  private oldCaretPosition!: TBRangePosition | null

  private middlewares: TBSelectionMiddleware[] = []

  constructor(private bridge: NativeSelectionBridge,
              private root: RootComponentRef,
              private renderer: Renderer) {
    this.onChange = this.changeEvent.asObservable().pipe(distinctUntilChanged((previous, current) => {
      if (previous && current) {
        return previous.startOffset === current.startOffset &&
          previous.endOffset === current.endOffset &&
          previous.startSlot === current.startSlot &&
          previous.endSlot === current.endSlot
      }
      return previous === current
    }))
    bridge.connect({
      setSelection: (range: TBRange | null) => {
        if (range === null) {
          if (null === this.startSlot && null === this.endSlot && null === this.startOffset && null === this.endOffset) {
            return
          }
          this.unSelect()
          this.broadcastChanged()
          return
        }
        const {startOffset, startSlot, endOffset, endSlot} = range
        if (startSlot === this.startSlot && endSlot === this.endSlot && startOffset === this.startOffset && endOffset === this.endOffset) {
          return
        }
        this.setStart(startSlot, startOffset)
        this.setEnd(endSlot, endOffset)
        this.broadcastChanged()
      }
    })
  }

  setStart(slot: Slot, offset: number) {
    this._startSlot = slot
    this._startOffset = offset
    slot.retain(offset)
  }

  setEnd(slot: Slot, offset: number) {
    this._endSlot = slot
    this._endOffset = offset
    slot.retain(offset)
  }

  setLocation(slot: Slot, offset: number) {
    this._startSlot = this._endSlot = slot
    this._startOffset = this._endOffset = offset
    slot.retain(offset)
  }

  selectComponent(componentInstance: ComponentInstance, isRestore = false) {
    const parent = componentInstance.parent
    if (parent) {
      const index = parent.indexOf(componentInstance)
      this.setStart(parent, index)
      this.setEnd(parent, index + 1)
      if (isRestore) {
        this.restore()
      }
    }
  }

  getSelectedScopes(): SelectedScope[] {
    if (!this.isSelected) {
      return []
    }
    if (this.isCollapsed) {
      return [{
        slot: this.startSlot!,
        startIndex: this.startOffset!,
        endIndex: this.startOffset!,
      }]
    }
    const scopes = this.getScopes(this.startSlot!, this.endSlot!, this.startOffset!, this.endOffset!)
    return this.middlewares.reduce((currentScopes: SelectedScope[], middleware: TBSelectionMiddleware) => {
      return middleware.getSelectedScopes(currentScopes)
    }, scopes.filter(item => {
      return item.startIndex < item.endIndex
    }))
  }

  toPrevious() {
    const position = this.getPreviousLocation()
    if (position) {
      this.setLocation(position.slot, position.offset)
      this.restore()
      this.broadcastChanged()
    }
  }

  toNext() {
    const position = this.getNextLocation()
    if (position) {
      this.setLocation(position.slot, position.offset)
      this.restore()
      this.broadcastChanged()
    }
  }

  toPreviousLine() {
    clearTimeout(this.cacheCaretPositionTimer)
    if (!this.isSelected) {
      return
    }
    let p: SelectionLocation
    if (this.oldCaretPosition) {
      p = this.getPreviousLinePosition(this.oldCaretPosition.left)
    } else {
      const rect = this.bridge.getRect({
        slot: this.startSlot!,
        offset: this.startOffset!
      })!
      this.oldCaretPosition = rect
      p = this.getPreviousLinePosition(rect.left)
    }
    this.cacheCaretPositionTimer = setTimeout(() => {
      this.oldCaretPosition = null
    }, 3000)
    this.setLocation(p.slot, p.offset)
    this.restore()
  }

  toNextLine() {
    clearTimeout(this.cacheCaretPositionTimer)
    if (!this.isSelected) {
      return
    }
    let p: SelectionLocation
    if (this.oldCaretPosition) {
      p = this.getNextLinePosition(this.oldCaretPosition.left)
    } else {
      const rect = this.bridge.getRect({
        slot: this.endSlot!,
        offset: this.endOffset!
      })!
      this.oldCaretPosition = rect
      p = this.getNextLinePosition(rect.left)
    }
    this.cacheCaretPositionTimer = setTimeout(() => {
      this.oldCaretPosition = null
    }, 3000)
    this.setLocation(p.slot, p.offset)
    this.restore()
  }

  collapse(toEnd = false) {
    if (toEnd) {
      this._startSlot = this._endSlot
      this._startOffset = this._endOffset
    } else {
      this._endSlot = this._startSlot
      this._endOffset = this._startOffset
    }
  }

  restore() {
    const startSlot = this.startSlot!
    const startOffset = this.startOffset!
    const endSlot = this.endSlot!
    const endOffset = this.endOffset!
    if (startSlot && endSlot) {
      startSlot.retain(startOffset)
      endSlot.retain(endOffset)
      this.bridge.restore({
        startOffset: this.startOffset!,
        startSlot: this.startSlot!,
        endOffset: this.endOffset!,
        endSlot: this.endSlot!
      })
    } else {
      this.bridge.restore(null)
    }
    this.broadcastChanged()
  }

  getPaths(): SelectionPaths {
    if (!this.commonAncestorSlot) {
      return {
        start: [],
        end: []
      }
    }
    const start = TBSelection.getPathsBySlot(this.startSlot!)
    start.push(this.startOffset!)
    const end = TBSelection.getPathsBySlot(this.endSlot!)
    end.push(this.endOffset!)
    return {
      start,
      end
    }
  }

  usePaths(paths: SelectionPaths) {
    const start = this.findLocationByPath(paths.start)
    const end = this.findLocationByPath(paths.end)
    if (start) {
      this._startSlot = start.slot
      this._startOffset = start.offset
    }
    if (end) {
      this._endSlot = end.slot
      this._endOffset = end.offset
    }
  }

  unSelect() {
    this._startSlot = this._endSlot = this._startOffset = this._endOffset = null
  }

  selectAll() {
    const slot = this.root.component.slots.get(0)!
    this.setStart(slot, 0)
    this.setEnd(slot, slot.length)
    this.restore()
  }

  addMiddleware(middleware: TBSelectionMiddleware) {
    this.middlewares.push(middleware)
  }

  /**
   * 获取下一个选区位置。
   */
  getNextLocation(): SelectionLocation | null {
    if (!this.isSelected) {
      return null
    }
    return this.getNextLocationByLocation(this.endSlot!, this.endOffset!)
  }

  /**
   * 获取上一个选区位置。
   */
  getPreviousLocation(): SelectionLocation | null {
    if (!this.isSelected) {
      return null
    }
    return this.getPreviousLocationByLocation(this.startSlot!, this.startOffset!)
  }

  findSlotByPaths(paths: number[]): Slot | null {
    const result = TBSelection.findTreeNode(paths, this.root.component)
    if (result instanceof Slot) {
      return result
    }
    return null
  }

  findComponentByPath(paths: number[]): ComponentInstance | null {
    const result = TBSelection.findTreeNode(paths, this.root.component)
    if (result instanceof Slot) {
      return null
    }
    return result
  }

  getBlocks(): SelectedScope[] {
    const blocks: SelectedScope[] = []
    if (!this.isSelected) {
      return blocks
    }

    function fn(slot: Slot, startIndex: number, endIndex: number, renderer: Renderer) {
      const scopes: SelectedScope[] = []
      if (startIndex >= endIndex) {
        return scopes
      }
      let newScope: SelectedScope | null = null

      let i = 0
      const contents = slot.sliceContent(startIndex, endIndex)
      contents.forEach(c => {
        if (typeof c !== 'string' && c.type === ContentType.BlockComponent) {
          newScope = null
          c.slots.toArray().forEach(s => {
            scopes.push(...fn(s, 0, s.length, renderer))
          })
        } else {
          if (!newScope) {
            newScope = {
              startIndex: startIndex + i,
              endIndex: startIndex + i + c.length,
              slot: slot
            }
            scopes.push(newScope)
          } else {
            newScope.endIndex = startIndex + i + c.length
          }
        }
        i += c.length
      })
      return scopes
    }

    const scopes = this.getExpandedScope()

    scopes.forEach(i => {
      blocks.push(...fn(i.slot, i.startIndex, i.endIndex, this.renderer))
    })
    return blocks
  }

  getSlotRange(): SelectedSlotRange | null {
    const ancestorComponent = this.commonAncestorComponent!
    if (!ancestorComponent) {
      return null
    }

    let startSlot = this.startSlot!
    let endSlot = this.endSlot!

    let startIndex: number
    let endIndex: number

    while (true) {
      const parent = startSlot.parent
      if (parent === ancestorComponent) {
        startIndex = parent.slots.indexOf(startSlot)
        break
      }
      if (parent?.parent) {
        startSlot = parent.parent
      } else {
        return null
      }
    }
    while (true) {
      const parent = endSlot.parent
      if (parent === ancestorComponent) {
        endIndex = parent.slots.indexOf(endSlot) + 1
        break
      }
      if (parent?.parent) {
        endSlot = parent.parent
      } else {
        return null
      }
    }

    if (startIndex >= 0 && endIndex >= 1) {
      return {
        startIndex,
        endIndex,
        component: ancestorComponent
      }
    }
    return null
  }

  getExpandedScope(): SelectedScope[] {
    if (!this.isSelected) {
      return []
    }
    return this.getScopes(this.startSlot!,
      this.endSlot!,
      TBSelection.findExpandedStartIndex(this.startSlot!, this.startOffset!),
      TBSelection.findExpandedEndIndex(this.endSlot!, this.endOffset!))
  }

  findFirstLocation(slot: Slot): SelectionLocation {
    const first = slot.getContentAtIndex(0)
    if (first && typeof first !== 'string') {
      const firstChildSlot = first.slots.first
      if (firstChildSlot) {
        return this.findFirstLocation(firstChildSlot)
      }
    }
    return {
      offset: 0,
      slot: slot
    }
  }

  findLastLocation(slot: Slot): SelectionLocation {
    const last = slot.getContentAtIndex(slot.length - 1)
    if (last && typeof last !== 'string') {
      const lastChildSlot = last.slots.last
      if (lastChildSlot) {
        return this.findLastLocation(lastChildSlot)
      }
    }
    return {
      offset: last === '\n' ?
        slot.length - 1 :
        slot.length,
      slot: slot
    }
  }

  getCommonAncestorSlotScope(): CommonAncestorSlotScope | null {
    if (!this.isSelected) {
      return null
    }
    let startSlot = this.startSlot!
    let endSlot = this.endSlot!
    let startChildSlot = this.startSlot!
    let endChildSlot = this.endSlot!
    let startIndex = this.startOffset!
    let endIndex = this.endOffset!
    const commonAncestorSlot = this.commonAncestorSlot
    const commonAncestorComponent = this.commonAncestorComponent

    let startChildComponent: ComponentInstance | null = null
    let endChildComponent: ComponentInstance | null = null

    while (startSlot !== commonAncestorSlot) {
      startChildComponent = startSlot.parent!
      if (startChildComponent === commonAncestorComponent) {
        startChildSlot = startSlot
      }
      startSlot = startChildComponent.parent!
      startIndex = startSlot.indexOf(startChildComponent)
    }

    while (endSlot !== commonAncestorSlot) {
      endChildComponent = endSlot.parent!
      if (endChildComponent === commonAncestorComponent) {
        endChildSlot = endSlot
      }
      endSlot = endChildComponent.parent!
      endIndex = endSlot.indexOf(endChildComponent)
    }

    return {
      startIndex,
      startSlot,
      startChildComponent,
      endIndex: endIndex + 1,
      endSlot,
      endChildComponent,
      startChildSlot,
      endChildSlot
    }
  }

  /**
   * 获取选区向上移动一行的位置。
   * @param startLeft 参考位置。
   */
  private getPreviousLinePosition(startLeft: number): SelectionLocation {
    this.getPreviousLocation()
    let isToPrevLine = false
    let loopCount = 0
    let minLeft = startLeft
    let startSlot = this.startSlot!
    let startOffset = this.startOffset!
    let minTop = this.bridge.getRect({
      slot: startSlot,
      offset: startOffset
    })!.top

    let position: SelectionLocation
    let oldPosition!: SelectionLocation
    let oldLeft = 0
    while (true) {
      loopCount++
      position = this.getPreviousLocationByLocation(startSlot, startOffset)
      startSlot = position.slot
      startOffset = position.offset
      const rect2 = this.bridge.getRect(position)!
      if (!isToPrevLine) {
        if (rect2.left > minLeft || rect2.top < minTop) {
          isToPrevLine = true
        } else if (rect2.left === minLeft && rect2.top === minTop) {
          return position
        }
        minLeft = rect2.left
        minTop = rect2.top
      }
      if (isToPrevLine) {
        if (rect2.left < startLeft) {
          return position
        }
        if (oldPosition) {
          if (rect2.left >= oldLeft) {
            return oldPosition
          }
        }
        oldLeft = rect2.left
        oldPosition = position
      }
      if (loopCount > 10000) {
        break
      }
    }
    return position || {
      offset: 0,
      slot: this.startSlot
    }
  }

  /**
   * 获取选区向下移动一行的位置。
   * @param startLeft 参考位置。
   */
  private getNextLinePosition(startLeft: number): SelectionLocation {
    let isToNextLine = false
    let loopCount = 0
    let maxRight = startLeft
    let endSlot = this.endSlot!
    let endOffset = this.endOffset!
    let minTop = this.bridge.getRect({
      slot: endSlot,
      offset: endOffset
    })!.top
    let oldPosition!: SelectionLocation
    let oldLeft = 0
    while (true) {
      loopCount++
      const position = this.getNextLocationByLocation(endSlot, endOffset)
      endSlot = position.slot
      endOffset = position.offset
      const rect2 = this.bridge.getRect(position)!
      if (!isToNextLine) {
        if (rect2.left < maxRight || rect2.top > minTop) {
          isToNextLine = true
        } else if (rect2.left === maxRight && rect2.top === minTop) {
          return position
        }
        maxRight = rect2.left
        minTop = rect2.top
        oldPosition = position
      }
      if (isToNextLine) {
        if (rect2.left > startLeft) {
          return oldPosition
        }
        if (oldPosition) {
          if (rect2.left <= oldLeft) {
            return oldPosition
          }
        }
        oldPosition = position
        oldLeft = rect2.left
      }
      if (loopCount > 10000) {
        break
      }
    }
    return oldPosition || {
      offset: endSlot.length,
      slot: endSlot
    }
  }

  private getNextLocationByLocation(slot: Slot, offset: number) {
    if (offset === slot.length - 1) {
      const current = slot.getContentAtIndex(offset)
      if (current === '\n') {
        offset++
      }
    }
    if (offset < slot.length) {
      let current = slot.getContentAtIndex(offset)

      if (current === '\n') {
        current = slot.getContentAtIndex(offset + 1)
      }
      if (current && typeof current !== 'string') {
        const firstChildSlot = current.slots.get(0)
        if (firstChildSlot) {
          return this.findFirstLocation(firstChildSlot)
        }
      }
      return {
        slot,
        offset: offset + 1
      }
    }

    // 循环向后找最后一个子 fragment，但有可能当前这个就是最后一个，这时循环
    // 向上会找不到，那么就使用当前的 fragment
    const cacheSlot = slot

    while (slot) {
      const parentComponent = slot.parent!
      const slotIndex = parentComponent.slots.indexOf(slot)
      if (slotIndex < parentComponent.slots.length - 1) {
        return this.findFirstLocation(parentComponent.slots.get(slotIndex + 1)!)
      }
      const parentSlot = parentComponent.parent
      if (!parentSlot) {
        const len = cacheSlot.length
        const last = cacheSlot.getContentAtIndex(len - 1)
        return {
          slot: cacheSlot,
          offset: last === '\n' ? len - 1 : len
        }
      }
      const componentIndex = parentSlot.indexOf(parentComponent)
      if (componentIndex < parentSlot.length - 1) {
        const nextContent = parentSlot.getContentAtIndex(componentIndex + 1)
        if (typeof nextContent !== 'string') {
          const nextFirstSlot = nextContent.slots.first
          if (nextFirstSlot) {
            return this.findFirstLocation(nextFirstSlot)
          }
        }
        return {
          slot: parentSlot,
          offset: componentIndex + 1
        }
      } else {
        slot = parentSlot
      }
    }
    return {
      slot: cacheSlot,
      offset: this.endOffset!
    }
  }

  private getPreviousLocationByLocation(slot: Slot, offset: number) {
    if (offset > 0) {
      const prev = slot.getContentAtIndex(offset - 1)!
      if (prev && typeof prev !== 'string') {
        const lastChildSlot = prev.slots.last
        if (lastChildSlot) {
          return this.findLastLocation(lastChildSlot)
        }
      }
      return {
        slot: slot,
        offset: offset - 1
      }
    }
    // 循环向前找第一个子 fragment，但有可能当前这个就是第一个，这时循环
    // 向上会找不到，那么就使用当前的 fragment
    const cacheSlot = slot

    while (slot) {
      const parentComponent = slot.parent!
      const slots = parentComponent.slots
      const slotIndex = slots.indexOf(slot)
      if (slotIndex > 0) {
        return this.findLastLocation(slots.get(slotIndex - 1)!)
      }

      const parentSlot = parentComponent.parent
      if (!parentSlot) {
        return {
          slot: cacheSlot,
          offset: 0
        }
      }
      const componentIndex = parentSlot.indexOf(parentComponent)
      if (componentIndex > 0) {
        const prevContent = parentSlot.getContentAtIndex(componentIndex - 1)
        if (prevContent && typeof prevContent !== 'string') {
          const lastChildSlot = prevContent.slots.last
          if (lastChildSlot) {
            return this.findLastLocation(lastChildSlot)
          }
        }
        return {
          slot: parentSlot,
          offset: prevContent === '\n' ? componentIndex - 1 : componentIndex
        }
      } else {
        slot = parentSlot
      }
    }
    return {
      slot: cacheSlot,
      offset: 0
    }
  }

  private findLocationByPath(paths: number[]) {
    const startPaths = [...paths]
    const offset = startPaths.pop()!
    const slot = this.findSlotByPaths(startPaths)!
    if (slot) {
      return {
        slot,
        offset
      }
    }
    return null
  }

  private broadcastChanged() {
    this.changeEvent.next(this.isSelected ? {
      startSlot: this.startSlot!,
      endSlot: this.endSlot!,
      startOffset: this.startOffset!,
      endOffset: this.endOffset!
    } : null)
  }


  private getScopes(startSlot: Slot,
                    endSlot: Slot,
                    startIndex: number,
                    endIndex: number): SelectedScope[] {
    const start: SelectedScope[] = []
    const end: SelectedScope[] = []
    let startParentComponent: ComponentInstance | null = null
    let endParentComponent: ComponentInstance | null = null

    let startSlotRefIndex: number | null = null
    let endSlotRefIndex: number | null = null

    const commonAncestorSlot = this.commonAncestorSlot
    const commonAncestorComponent = this.commonAncestorComponent

    while (startSlot !== commonAncestorSlot) {
      start.push({
        startIndex,
        endIndex: startSlot.length,
        slot: startSlot
      })

      startParentComponent = startSlot.parent!

      const childSlots = startParentComponent.slots
      const end = childSlots.indexOf(this.endSlot!)
      startSlotRefIndex = childSlots.indexOf(startSlot)
      if (startParentComponent !== commonAncestorComponent && end === -1) {
        start.push(...childSlots.slice(startSlotRefIndex + 1, childSlots.length).map(slot => {
          return {
            startIndex: 0,
            endIndex: slot.length,
            slot
          }
        }))
      }
      if (!startParentComponent.parent) {
        break
      }
      startSlot = startParentComponent.parent
      startIndex = startSlot.indexOf(startParentComponent) + 1
    }
    while (endSlot !== commonAncestorSlot) {
      end.push({
        startIndex: 0,
        endIndex,
        slot: endSlot
      })
      endParentComponent = endSlot.parent
      if (!endParentComponent) {
        break
      }
      const childSlots = endParentComponent.slots
      const index = childSlots.indexOf(this.startSlot!)

      endSlotRefIndex = childSlots.indexOf(endSlot)
      if (endParentComponent !== commonAncestorComponent && index === -1) {
        end.push(...childSlots.slice(0, endSlotRefIndex).map(slot => {
          return {
            startIndex: 0,
            endIndex: slot.length,
            slot
          }
        }).reverse())
      }
      if (!endParentComponent.parent) {
        break
      }
      endSlot = endParentComponent.parent
      endIndex = endSlot.indexOf(endParentComponent)
    }
    const result: Omit<SelectedScope, 'isStart' | 'isEnd'>[] = [...start]
    if (startParentComponent && startParentComponent === endParentComponent) {
      const slots = startParentComponent.slots.slice(startSlotRefIndex! + 1, endSlotRefIndex!)
      result.push(...slots.map(slot => {
        return {
          startIndex: 0,
          endIndex: slot.length,
          slot
        }
      }))
    } else {
      result.push({
        startIndex,
        endIndex,
        slot: commonAncestorSlot!
      })
    }
    result.push(...end.reverse())

    return result
  }

  private static findTreeNode(paths: number[], component: ComponentInstance): Slot | ComponentInstance | null {
    const firstSlotRefIndex = paths.shift()!
    const slot = component.slots.get(firstSlotRefIndex)!
    if (paths.length === 0) {
      return slot || null
    }
    const position = paths.shift()!

    component = slot.getContentAtIndex(position) as ComponentInstance

    if (paths.length === 0) {
      return component || null
    }
    return TBSelection.findTreeNode(paths, component)
  }

  private static getPathsBySlot(slot: Slot) {
    const paths: number[] = []

    while (true) {
      const parentComponent = slot.parent
      if (!parentComponent) {
        break
      }
      const slotIndex = parentComponent.slots.indexOf(slot)
      paths.push(slotIndex)

      const parentSlotRef = parentComponent.parent
      if (!parentSlotRef) {
        break
      }
      const componentIndex = parentSlotRef.indexOf(parentComponent)
      paths.push(componentIndex)
      slot = parentSlotRef
    }
    return paths.reverse()
  }

  private static findExpandedStartIndex(slot: Slot, index: number) {
    const contents = slot.sliceContent(0, index)
    const len = contents.length
    for (let i = len - 1; i >= 0; i--) {
      const item = contents[i]
      if (typeof item !== 'string' && item.type === ContentType.BlockComponent) {
        break
      }
      index -= item.length
    }
    return index
  }

  private static findExpandedEndIndex(slot: Slot, index: number) {
    const contents = slot.sliceContent(index)

    for (let i = 0; i < contents.length; i++) {
      const item = contents[i]
      if (typeof item !== 'string' && item.type === ContentType.BlockComponent) {
        break
      }
      index += item.length
    }
    return index
  }
}
