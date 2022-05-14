import { Injectable, Prop } from '@tanbo/di'
import { distinctUntilChanged, map, Observable, Subject, Subscription } from '@tanbo/stream'

import { ComponentInstance, ContentType, invokeListener, Slot, Event } from '../model/_api'
import { Renderer } from './renderer'
import { RootComponentRef } from './_injection-tokens'

export interface Range {
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

/**
 * 原生选区连接器
 */
export interface NativeSelectionConnector {
  /**
   * 当原生选区变化时，生成对应的 Textbus 选区，并传入 Textbus 选区
   * @param range 对应原生选区在 Textbus 中的选区
   * @param isFocusEnd 线束插槽是否为焦点插槽
   */
  setSelection(range: Range | null, isFocusEnd?: boolean): void
}

export interface SelectionPosition {
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

export interface RangePosition {
  left: number
  top: number
}

/**
 * 用于跨平台实现的原生选区抽象类
 */
export abstract class NativeSelectionBridge {
  /**
   * 连接方法，Textbus 在需要桥接原生选区时调用，并传入连接器
   * @param connector
   */
  abstract connect(connector: NativeSelectionConnector): void

  /**
   * 取消连接方法，Textbus 会在不需要桥接选区时调用
   */
  abstract disConnect(): void

  /**
   * Textbus 选区变化时调用，同时传入选区位置，用于原生选区实现具体平台的拖蓝效果
   * @param range
   */
  abstract restore(range: Range | null): void

  /**
   * 获取原生选区的坐标位置，用于 Textbus 计算光标移动相关功能
   * @param position
   */
  abstract getRect(position: SelectionPosition): RangePosition | null
}

export interface SelectionPaths {
  start: number[]
  end: number[]
  focusEnd: boolean
}

/**
 * Textbus 选区实现类，用于选择 Textbus 文档内的内容
 */
@Injectable()
export class Selection {
  @Prop()
  private bridge!: NativeSelectionBridge
  /** 当选区变化时触发 */
  onChange: Observable<Range | null>

  /** 当前是否有选区 */
  get isSelected() {
    return ![this.startSlot, this.startOffset, this.endSlot, this.endOffset].includes(null)
  }

  /** 当前选区是否闭合 */
  get isCollapsed() {
    return this.isSelected && this.startSlot === this.endSlot && this.startOffset === this.endOffset
  }

  /** 选区开始插槽 */
  get startSlot() {
    return this._startSlot
  }

  /** 选区开始位置在开始插槽中的索引 */
  get startOffset() {
    return this._startOffset
  }

  /** 选区结束插槽 */
  get endSlot() {
    return this._endSlot
  }

  /** 选区结束位置在线束插槽中的索引 */
  get endOffset() {
    return this._endOffset
  }

  /** 锚点插槽 */
  get anchorSlot() {
    return this.focusSlot === this.startSlot ? this.endSlot : this.startSlot
  }

  /** 锚点插槽偏移量 */
  get anchorOffset() {
    if (this.focusSlot === this.startSlot && this._focusOffset === this.startOffset) {
      return this.endOffset
    }
    return this.startOffset
  }

  /** 焦点插槽 */
  get focusSlot() {
    if (this._focusSlot === this.startSlot) {
      return this.startSlot
    }
    return this.endSlot
  }

  /** 焦点插槽偏移量 */
  get focusOffset() {
    if (this.focusSlot === this.startSlot && this._focusOffset === this.startOffset) {
      return this.startOffset
    }
    return this.endOffset
  }

  /**
   * 选区的公共父插槽
   */
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

  /**
   * 选区的公共父组件
   */
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

  get nativeSelectionDelegate() {
    return this._nativeSelectionDelegate
  }

  set nativeSelectionDelegate(v: boolean) {
    this._nativeSelectionDelegate = v
    if (v) {
      this.bridge.connect({
        setSelection: (range: Range | null, isFocusEnd = true) => {
          if (range === null) {
            if (null === this.startSlot && null === this.endSlot && null === this.startOffset && null === this.endOffset) {
              return
            }
            this.unSelect()
            return
          }
          const {startOffset, startSlot, endOffset, endSlot} = range
          if (startSlot === this.startSlot && endSlot === this.endSlot && startOffset === this.startOffset && endOffset === this.endOffset) {
            return
          }
          this.setStart(startSlot, startOffset)
          this.setEnd(endSlot, endOffset)
          if (isFocusEnd) {
            this._focusSlot = this.endSlot
            this._focusOffset = this.endOffset
          } else {
            this._focusSlot = this.startSlot
            this._focusOffset = this.startOffset
          }
          this.broadcastChanged()
        }
      })
    } else {
      this.unSelect()
      this.bridge.disConnect()
    }
  }

  private _startSlot: Slot | null = null
  private _endSlot: Slot | null = null
  private _startOffset: number | null = null
  private _endOffset: number | null = null
  private _focusSlot: Slot | null = null
  private _focusOffset: number | null = null
  private changeEvent = new Subject<Range | null>()

  private _nativeSelectionDelegate = true

  private cacheCaretPositionTimer!: any
  private oldCaretPosition!: RangePosition | null

  private subscriptions: Subscription[] = []

  constructor(private root: RootComponentRef,
              private renderer: Renderer) {
    let prevFocusComponent: ComponentInstance | null
    this.onChange = this.changeEvent.asObservable().pipe(distinctUntilChanged((previous, current) => {
      if (previous && current) {
        return !(previous.startOffset === current.startOffset &&
          previous.endOffset === current.endOffset &&
          previous.startSlot === current.startSlot &&
          previous.endSlot === current.endSlot)
      }
      return previous !== current
    }))
    this.subscriptions.push(
      this.onChange.pipe(
        map<any, ComponentInstance | null>(() => {
          if (this.startSlot?.parent === this.endSlot?.parent) {
            return this.startSlot?.parent || null
          }
          return null
        }),
        distinctUntilChanged()
      ).subscribe(component => {
        if (prevFocusComponent) {
          invokeListener(prevFocusComponent, 'onBlur')
        }
        if (component) {
          invokeListener(component, 'onFocus')
        }
        prevFocusComponent = component
      }),
      this.onChange.pipe(
        map(() => {
          if (!this.isSelected) {
            return null
          }
          if (this.startSlot === this.endSlot && this.endOffset! - this.startOffset! === 1) {
            const content = this.startSlot!.getContentAtIndex(this.startOffset!)
            if (typeof content !== 'string') {
              return content
            }
          }
          return null
        }),
        distinctUntilChanged()
      ).subscribe(component => {
        if (component) {
          invokeListener(component, 'onSelected')
        }
      })
    )
    Promise.resolve().then(() => this.nativeSelectionDelegate = true)
  }

  destroy() {
    this.subscriptions.forEach(i => i.unsubscribe())
    this.subscriptions = []
  }

  /**
   * 设置选区的开始位置
   * @param slot 开始位置的插槽
   * @param offset 开始位置索引
   */
  setStart(slot: Slot, offset: number) {
    this._startSlot = slot
    slot.retain(offset)
    this._startOffset = slot.index
  }

  /**
   * 设置选区结束位置
   * @param slot 结束位置的插槽
   * @param offset 结束位置的索引
   */
  setEnd(slot: Slot, offset: number) {
    this._endSlot = slot
    slot.retain(offset)
    this._endOffset = slot.index
  }

  /**
   * 设置选区位置
   * @param slot 选区所以插槽
   * @param offset 选区位置索引
   */
  setPosition(slot: Slot, offset: number) {
    this._startSlot = this._endSlot = slot
    slot.retain(offset)
    this._startOffset = this._endOffset = slot.index
  }

  /**
   * 设置选区选择一个组件
   * @param componentInstance 要选择的组件
   * @param isRestore 是否同步触发原生选区，默认为 `false`
   */
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

  /**
   * 获取选区所选择的块的集合
   */
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
    return scopes.filter(item => {
      return item.startIndex < item.endIndex
    })
  }

  /**
   * 把光标移动到前一个位置
   */
  toPrevious() {
    if (!this.isCollapsed) {
      this.collapse(true)
      this.restore()
      this.broadcastChanged()
      return
    }
    const {startSlot, startOffset} = this
    const position = this.getPreviousPosition()
    if (position) {
      this.setPosition(position.slot, position.offset)

      let content: ComponentInstance | string | null = null
      if (startSlot === this.startSlot) {
        if (startOffset === this.startOffset) {
          const first = this.root.component.slots.first!
          this.setPosition(first, 0)
        } else if (startOffset! - this.startOffset! === 1) {
          content = startSlot!.getContentAtIndex(this.startOffset!)
        }
      } else if (startSlot?.parent !== this.startSlot?.parent) {
        content = this.endSlot?.parent || null
      }
      if (content && typeof content !== 'string') {
        let isPreventDefault = true
        invokeListener(content, 'onSelectionFromEnd', new Event(startSlot!, null, () => {
          isPreventDefault = false
        }))
        if (!isPreventDefault) {
          if (content.slots.length === 0) {
            this.selectComponent(content)
          }
        } else {
          this.setPosition(startSlot!, startOffset!)
        }
      }
      this.restore()
      this.broadcastChanged()
    }
  }

  /**
   * 把光标移动到后一个位置
   */
  toNext() {
    if (!this.isCollapsed) {
      this.collapse()
      this.restore()
      this.broadcastChanged()
      return
    }
    const {endSlot, endOffset} = this
    const position = this.getNextPosition()
    if (position) {
      let offset = position.offset
      const slot = position.slot
      while (offset <= slot.length) {
        this.setPosition(slot, offset)
        if (slot.index < offset) {
          offset++
        } else {
          break
        }
      }
      let content: ComponentInstance | string | null = null
      if (endSlot === this.endSlot) {
        if (endOffset === this.endOffset) {
          const last = this.root.component.slots.last!
          this.setPosition(last, last.length)
        } else if (this.endOffset! - endOffset! === 1) {
          content = endSlot!.getContentAtIndex(endOffset!)
        }
      } else if (endSlot?.parent !== this.endSlot?.parent) {
        content = this.endSlot?.parent || null
      }
      if (content && typeof content !== 'string') {
        let isPreventDefault = true
        invokeListener(content, 'onSelectionFromFront', new Event(endSlot!, null, () => {
          isPreventDefault = false
        }))
        if (!isPreventDefault) {
          if (content.slots.length === 0) {
            this.selectComponent(content)
          }
        } else {
          this.setPosition(endSlot!, endOffset!)
        }
      }
      this.restore()
      this.broadcastChanged()
    }
  }

  /**
   * 把光标移动到上一行
   */
  toPreviousLine() {
    const p = this.getLinePosition(false)
    if (p) {
      this.setPosition(p.slot, p.offset)
      this.restore()
    }
  }

  /**
   * 把光标移动到下一行
   */
  toNextLine() {
    const p = this.getLinePosition(true)
    if (p) {
      this.setPosition(p.slot, p.offset)
      this.restore()
    }
  }

  /**
   * 向右框选
   */
  wrapToAfter() {
    this.wrapTo(false)
  }

  /**
   * 向左框选
   */
  wrapToBefore() {
    this.wrapTo(true)
  }

  /**
   * 向上一行框选
   */
  wrapToTop() {
    this.wrapLineTo(false)
  }

  /**
   * 向下一行框选
   */
  wrapToBottom() {
    this.wrapLineTo(true)
  }

  /**
   * 闭合选区
   * @param toStart 是否闭合到结束位置
   */
  collapse(toStart = false) {
    if (toStart) {
      this._endSlot = this._startSlot
      this._endOffset = this._startOffset
    } else {
      this._startSlot = this._endSlot
      this._startOffset = this._endOffset
    }
  }

  /**
   * 立即同步 Textbus 选区到原生选区
   */
  restore() {
    if (this.nativeSelectionDelegate) {
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
    }
    this.broadcastChanged()
  }

  /**
   * 获取当前选区在文档中的路径
   */
  getPaths(): SelectionPaths {
    if (!this.commonAncestorSlot) {
      return {
        start: [],
        end: [],
        focusEnd: true
      }
    }
    const start = Selection.getPathsBySlot(this.startSlot!)
    start.push(this.startOffset!)
    const end = Selection.getPathsBySlot(this.endSlot!)
    end.push(this.endOffset!)
    return {
      start,
      end,
      focusEnd: this.focusSlot === this.endSlot && this.focusOffset === this.endOffset
    }
  }

  /**
   * 把选区设置为指定的路径
   * @param paths
   */
  usePaths(paths: SelectionPaths) {
    const start = this.findPositionByPath(paths.start)
    const end = this.findPositionByPath(paths.end)
    if (start) {
      this._startSlot = start.slot
      this._startOffset = start.offset
      if (!paths.focusEnd) {
        this._focusSlot = start.slot
        this._focusOffset = start.offset
      }
    }
    if (end) {
      this._endSlot = end.slot
      this._endOffset = end.offset
      if (paths.focusEnd) {
        this._focusSlot = end.slot
        this._focusOffset = end.offset
      }
    }
  }

  /**
   * 取消选区
   */
  unSelect() {
    this._startSlot = this._endSlot = this._startOffset = this._endOffset = null
    this.restore()
  }

  /**
   * 选择整个文档
   */
  selectAll() {
    const slot = this.root.component.slots.get(0)!
    this.setStart(slot, 0)
    this.setEnd(slot, slot.length)
    this.restore()
  }

  /**
   * 获取下一个选区位置。
   */
  getNextPosition(): SelectionPosition | null {
    if (!this.isSelected) {
      return null
    }
    return this.getNextPositionByPosition(this.endSlot!, this.endOffset!)
  }

  /**
   * 获取上一个选区位置。
   */
  getPreviousPosition(): SelectionPosition | null {
    if (!this.isSelected) {
      return null
    }
    return this.getPreviousPositionByPosition(this.startSlot!, this.startOffset!)
  }

  /**
   * 根据路径获取对应的插槽
   * @param paths
   */
  findSlotByPaths(paths: number[]): Slot | null {
    const result = Selection.findTreeNode(paths, this.root.component)
    if (result instanceof Slot) {
      return result
    }
    return null
  }

  /**
   * 根据路径获取对应的组件
   * @param paths
   */
  findComponentByPaths(paths: number[]): ComponentInstance | null {
    const result = Selection.findTreeNode(paths, this.root.component)
    if (result instanceof Slot) {
      return null
    }
    return result
  }

  /**
   * 获取选区内所有的块集合
   */
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

    const scopes = this.getGreedyScopes()

    scopes.forEach(i => {
      blocks.push(...fn(i.slot, i.startIndex, i.endIndex, this.renderer))
    })
    return blocks
  }

  /**
   * 获取开始插槽和结束插槽在公共组件内的下标范围
   */
  getSlotRangeInCommonAncestorComponent(): SelectedSlotRange | null {
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

  /**
   * 获取当前选区在开始和结束位置均扩展到最大行内内容位置是的块
   */
  getGreedyScopes(): SelectedScope[] {
    if (!this.isSelected) {
      return []
    }
    return this.getScopes(this.startSlot!,
      this.endSlot!,
      Selection.findExpandedStartIndex(this.startSlot!, this.startOffset!),
      Selection.findExpandedEndIndex(this.endSlot!, this.endOffset!))
  }

  /**
   * 查找插槽内最深的第一个光标位置
   * @param slot
   */
  findFirstPosition(slot: Slot): SelectionPosition {
    const first = slot.getContentAtIndex(0)
    if (first && typeof first !== 'string') {
      const firstChildSlot = first.slots.first
      if (firstChildSlot) {
        return this.findFirstPosition(firstChildSlot)
      }
    }
    return {
      offset: 0,
      slot: slot
    }
  }

  /**
   * 查的插槽内最深的最后一个光标位置
   * @param slot
   */
  findLastPosition(slot: Slot): SelectionPosition {
    const last = slot.getContentAtIndex(slot.length - 1)
    if (last && typeof last !== 'string') {
      const lastChildSlot = last.slots.last
      if (lastChildSlot) {
        return this.findLastPosition(lastChildSlot)
      }
    }
    return {
      offset: last === '\n' ?
        slot.length - 1 :
        slot.length,
      slot: slot
    }
  }

  /**
   * 获取当前选区在公共插槽的位置
   */
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

  getScopes(startSlot: Slot,
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

  private wrapTo(toLeft: boolean) {
    if (!this.isSelected) {
      return
    }
    const isFocusEnd = this.focusSlot === this.endSlot && this.focusOffset === this.endOffset
    const position = toLeft ?
      this.getPreviousPositionByPosition(this.focusSlot!, this.focusOffset!) :
      this.getNextPositionByPosition(this.focusSlot!, this.focusOffset!)
    this.normalizedSelection(position, isFocusEnd)
  }

  private wrapLineTo(toBottom: boolean) {
    const isFocusEnd = this.focusSlot === this.endSlot && this.focusOffset === this.endOffset
    const position = this.getLinePosition(toBottom)
    if (position) {
      this.normalizedSelection(position, isFocusEnd)
    }
  }

  private normalizedSelection(position: SelectionPosition, isFocusEnd: boolean) {
    if (isFocusEnd) {
      this.setEnd(position.slot, position.offset)
    } else {
      this.setStart(position.slot, position.offset)
    }
    this.restore()
    this.broadcastChanged()
    this._focusSlot = isFocusEnd ? this.endSlot : this.startSlot
    this._focusOffset = isFocusEnd ? this.endOffset : this.startOffset

    const {start, end} = this.getPaths()
    while (true) {
      const startFirstPath = start.shift()
      const endFirstPath = end.shift()

      if (typeof startFirstPath === 'undefined' || typeof endFirstPath === 'undefined') {
        break
      }

      if (startFirstPath > endFirstPath) {
        const {startOffset, startSlot, endOffset, endSlot} = this
        this.setStart(endSlot!, endOffset!)
        this.setEnd(startSlot!, startOffset!)
      }
    }
  }

  private getLinePosition(toNext: boolean): SelectionPosition | null {
    clearTimeout(this.cacheCaretPositionTimer)
    if (!this.isSelected) {
      return null
    }
    let p: SelectionPosition
    if (this.oldCaretPosition) {
      p = toNext ?
        this.getNextLinePositionByOffset(this.oldCaretPosition.left) :
        this.getPreviousLinePositionByOffset(this.oldCaretPosition.left)
    } else {
      this.oldCaretPosition = this.bridge.getRect({
        slot: this.focusSlot!,
        offset: this.focusOffset!
      })!
      p = toNext ?
        this.getNextLinePositionByOffset(this.oldCaretPosition.left) :
        this.getPreviousLinePositionByOffset(this.oldCaretPosition.left)
    }
    this.cacheCaretPositionTimer = setTimeout(() => {
      this.oldCaretPosition = null
    }, 3000)
    return p
  }

  /**
   * 获取选区向上移动一行的位置。
   * @param startLeft 参考位置。
   */
  private getPreviousLinePositionByOffset(startLeft: number): SelectionPosition {
    this.getPreviousPosition()
    let isToPrevLine = false
    let loopCount = 0
    let minLeft = startLeft
    let startSlot = this.startSlot!
    let startOffset = this.startOffset!
    let minTop = this.bridge.getRect({
      slot: startSlot,
      offset: startOffset
    })!.top

    let position: SelectionPosition
    let oldPosition!: SelectionPosition
    let oldLeft = 0
    while (true) {
      loopCount++
      position = this.getPreviousPositionByPosition(startSlot, startOffset)
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
  private getNextLinePositionByOffset(startLeft: number): SelectionPosition {
    let isToNextLine = false
    let loopCount = 0
    let maxRight = startLeft
    let endSlot = this.endSlot!
    let endOffset = this.endOffset!
    let minTop = this.bridge.getRect({
      slot: endSlot,
      offset: endOffset
    })!.top
    let oldPosition!: SelectionPosition
    let oldLeft = 0
    while (true) {
      loopCount++
      const position = this.getNextPositionByPosition(endSlot, endOffset)
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

  private getNextPositionByPosition(slot: Slot, offset: number) {
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
          return this.findFirstPosition(firstChildSlot)
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
        return this.findFirstPosition(parentComponent.slots.get(slotIndex + 1)!)
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
            return this.findFirstPosition(nextFirstSlot)
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

  private getPreviousPositionByPosition(slot: Slot, offset: number) {
    if (offset > 0) {
      const prev = slot.getContentAtIndex(offset - 1)!
      if (prev && typeof prev !== 'string') {
        const lastChildSlot = prev.slots.last
        if (lastChildSlot) {
          return this.findLastPosition(lastChildSlot)
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
        return this.findLastPosition(slots.get(slotIndex - 1)!)
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
            return this.findLastPosition(lastChildSlot)
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

  private findPositionByPath(paths: number[]) {
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

  private static findTreeNode(paths: number[], component: ComponentInstance): Slot | ComponentInstance | null {
    if (typeof component !== 'object') {
      return null
    }
    const firstSlotRefIndex = paths.shift()!

    const slot = component.slots.get(firstSlotRefIndex)!
    if (paths.length === 0 || !slot) {
      return slot || null
    }
    const position = paths.shift()!

    component = slot.getContentAtIndex(position) as ComponentInstance

    if (paths.length === 0 || !component) {
      return component || null
    }
    return Selection.findTreeNode(paths, component)
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
