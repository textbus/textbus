import { Injectable, Prop } from '@viewfly/core'
import { distinctUntilChanged, map, Observable, share, Subject, Subscription } from '@tanbo/stream'

import { ComponentInstance, ContentType, Event, GetRangesEvent, invokeListener, Slot, SlotRange } from '../model/_api'
import { RootComponentRef } from './_injection-tokens'
import { Controller } from './controller'

/**
 * 选区锚点和焦点位置
 */
export interface AbstractSelection {
  focusSlot: Slot
  anchorSlot: Slot
  focusOffset: number
  anchorOffset: number
}

/**
 * 选区开始和结果位置
 */
export interface Range {
  startSlot: Slot
  endSlot: Slot
  startOffset: number
  endOffset: number
}

/**
 * 选中组件的子插槽范围
 */
export interface SelectedSlotRange {
  startOffset: number
  endOffset: number
  component: ComponentInstance
}

/**
 * 原生选区连接器
 */
export interface NativeSelectionConnector {
  /**
   * 当原生选区变化时，生成对应的 Textbus 选区，并传入 Textbus 选区
   * @param abstractSelection 对应原生选区在 Textbus 中的选区
   */
  setSelection(abstractSelection: AbstractSelection | null): void
}

/**
 * 插槽偏移量
 */
export interface SelectionPosition {
  slot: Slot
  offset: number
}

/**
 * 选中选区在组件树中的位置
 */
export interface CommonAncestorSlotScope {
  startOffset: number
  startSlot: Slot
  startChildComponent: ComponentInstance | null
  endOffset: number
  endSlot: Slot
  endChildComponent: ComponentInstance | null
  startChildSlot: Slot
  endChildSlot: Slot
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
   * @param changeFromLocal 是否是本地引起的变化
   */
  abstract restore(range: AbstractSelection | null, changeFromLocal: boolean): void

  /**
   * 获取上一行光标位置
   * @param position
   */
  abstract getPreviousLinePositionByCurrent(position: SelectionPosition): SelectionPosition | null

  /**
   * 获取下一行光标位置
   * @param position
   */
  abstract getNextLinePositionByCurrent(position: SelectionPosition): SelectionPosition | null
}

/**
 * 选区锚点和焦点的绝对路径
 */
export interface SelectionPaths {
  anchor: number[]
  focus: number[]
}

/**
 * 选区快照
 */
export interface SelectionSnapshot {
  /**
   * 恢复选区
   * @param syncNative 是否同步原生选区
   */
  restore(syncNative?: boolean): void
}

/**
 * Textbus 选区实现类，用于选择 Textbus 文档内的内容
 */
@Injectable()
export class Selection {
  @Prop()
  private bridge!: NativeSelectionBridge
  /** 当选区变化时触发 */
  onChange: Observable<AbstractSelection | null>

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
    return this._anchorSlot
  }

  /** 锚点插槽偏移量 */
  get anchorOffset() {
    return this._anchorOffset
  }

  /** 焦点插槽 */
  get focusSlot() {
    return this._focusSlot
  }

  /** 焦点插槽偏移量 */
  get focusOffset() {
    return this._focusOffset
  }

  /**
   * 选区的公共父插槽
   */
  get commonAncestorSlot(): Slot | null {
    return this._commonAncestorSlot
  }

  /**
   * 选区的公共父组件
   */
  get commonAncestorComponent(): ComponentInstance | null {
    return this._commonAncestorComponent
  }

  /**
   * 是否代理原生选区
   */
  get nativeSelectionDelegate() {
    return this._nativeSelectionDelegate
  }

  set nativeSelectionDelegate(v: boolean) {
    if (v === this._nativeSelectionDelegate) {
      return
    }
    this._nativeSelectionDelegate = v
    if (this.controller.readonly) {
      return
    }
    if (v) {
      this.bridge.connect(this.connector)
    } else {
      // this.unSelect()
      this.bridge.disConnect()
    }
  }

  private connector: NativeSelectionConnector = {
    setSelection: (range: AbstractSelection | null) => {
      if (range === null) {
        if (null === this.startSlot && null === this.endSlot && null === this.startOffset && null === this.endOffset) {
          return
        }
        this.unSelect()
        return
      }
      const { focusOffset, focusSlot, anchorOffset, anchorSlot } = range
      if (focusSlot === this.focusSlot &&
        anchorSlot === this.anchorSlot &&
        focusOffset === this.focusOffset &&
        anchorOffset === this.anchorOffset) {
        return
      }
      this.setBaseAndExtent(anchorSlot, anchorOffset, focusSlot, focusOffset)
    }
  }

  private _commonAncestorSlot: Slot | null = null
  private _commonAncestorComponent: ComponentInstance | null = null

  private _startSlot: Slot | null = null
  private _endSlot: Slot | null = null
  private _startOffset: number | null = null
  private _endOffset: number | null = null
  private _anchorSlot: Slot | null = null
  private _anchorOffset: number | null = null
  private _focusSlot: Slot | null = null
  private _focusOffset: number | null = null
  private changeEvent = new Subject<AbstractSelection | null>()

  private _nativeSelectionDelegate = false

  private subscriptions: Subscription[] = []

  private customRanges: SlotRange[] | null = null

  private changeFromUpdateCustomRanges = false

  constructor(private root: RootComponentRef,
              private controller: Controller) {
    let prevFocusComponent: ComponentInstance | null
    this.onChange = this.changeEvent.asObservable().pipe(
      distinctUntilChanged((previous, current) => {
        if (previous && current) {
          return !(previous.focusOffset === current.focusOffset &&
            previous.anchorOffset === current.anchorOffset &&
            previous.focusSlot === current.focusSlot &&
            previous.anchorSlot === current.anchorSlot)
        }
        return previous !== current
      }),
      share()
    )
    let selectedComponent: ComponentInstance | null = null
    const focusInComponents: ComponentInstance[] = []
    this.subscriptions.push(
      controller.onReadonlyStateChange.subscribe(b => {
        if (b) {
          this.bridge.disConnect()
        } else {
          this.bridge.connect(this.connector)
        }
      }),
      this.onChange.pipe(
        map(() => {
          return this.commonAncestorComponent
        }),
        distinctUntilChanged()
      ).subscribe(component => {
        while (focusInComponents.length) {
          const focusOutComponent = focusInComponents.shift()!
          let parentComponent: ComponentInstance | null = focusOutComponent
          while (parentComponent) {
            if (parentComponent === root.component) {
              invokeListener(focusOutComponent, 'onFocusOut')
            }
            parentComponent = parentComponent.parentComponent
          }
        }
        while (component) {
          focusInComponents.push(component)
          invokeListener(component, 'onFocusIn')
          component = component.parentComponent
        }
      }),
      this.onChange.pipe(map(() => {
        return this.commonAncestorComponent
      })).subscribe(commonAncestorComponent => {
        let ranges: SlotRange[] | null = null
        if (commonAncestorComponent) {
          invokeListener(commonAncestorComponent, 'onGetRanges',
            new GetRangesEvent(commonAncestorComponent, (rgs: SlotRange[]) => {
              ranges = rgs
            }))
        }
        if (!this.changeFromUpdateCustomRanges) {
          this.customRanges = ranges
        }
      }),
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
          let parentComponent: ComponentInstance | null = prevFocusComponent
          while (parentComponent) {
            if (parentComponent === root.component) {
              invokeListener(prevFocusComponent, 'onBlur')
            }
            parentComponent = parentComponent.parentComponent
          }
        }
        if (component) {
          invokeListener(component, 'onFocus')
        }
        prevFocusComponent = component
      }),
      this.onChange.pipe(
        map(() => {
          if (selectedComponent) {
            let p = selectedComponent.parentComponent
            while (p) {
              if (p === root.component) {
                invokeListener(selectedComponent, 'onUnselect')
              }
              p = p.parentComponent
            }
            selectedComponent = null
          }
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
          selectedComponent = component
        }
      })
    )
    Promise.resolve().then(() => this.nativeSelectionDelegate = true)
  }

  /**
   * 创建选区快照，并可在需要时恢复选区，前提是缓存的插槽和位置还在文档中存在
   */
  createSnapshot(): SelectionSnapshot {
    const { anchorSlot, anchorOffset, focusSlot, focusOffset } = this
    return {
      restore: (syncNative?: boolean) => {
        this._anchorSlot = anchorSlot
        this._anchorOffset = anchorOffset
        this._focusSlot = focusSlot
        this._focusOffset = focusOffset
        this.resetStartAndEndPosition()
        if (syncNative) {
          this.restore(true)
        }
      }
    }
  }

  /**
   * 销毁选区
   */
  destroy() {
    this.subscriptions.forEach(i => i.unsubscribe())
    this.subscriptions = []
  }

  /**
   * 设置自定义选中的区间
   * @param ranges
   */
  setSelectedRanges(ranges: SlotRange[]) {
    this.changeFromUpdateCustomRanges = true
    this.customRanges = ranges
    this.broadcastChanged()
    this.changeFromUpdateCustomRanges = false
  }

  /**
   * 设置锚点和焦点的位置
   * @param anchorSlot 锚点插槽
   * @param anchorOffset 锚点偏移量
   * @param focusSlot 焦点插槽
   * @param focusOffset 焦点偏移量
   */
  setBaseAndExtent(anchorSlot: Slot, anchorOffset: number, focusSlot: Slot, focusOffset: number) {
    if (this.controller.readonly) {
      return
    }
    this._anchorSlot = anchorSlot
    anchorSlot.retain(anchorOffset)
    this._anchorOffset = anchorSlot.index
    this._focusSlot = focusSlot
    focusSlot.retain(focusOffset)
    this._focusOffset = focusSlot.index
    this.resetStartAndEndPosition()
  }

  /**
   * 获取选区内的选择范围，一般情况下为一个。组件可以 onGetRanges 勾子函数中定制范围个数，如表格中可能为多个
   */
  getRanges(): Range[] {
    if (this.customRanges) {
      return this.customRanges.map(i => {
        return {
          startOffset: i.startIndex,
          endOffset: i.endIndex,
          startSlot: i.slot,
          endSlot: i.slot
        }
      })
    }
    return this.isSelected ? [{
      startSlot: this.startSlot!,
      endSlot: this.endSlot!,
      startOffset: this.startOffset!,
      endOffset: this.endOffset!
    }] : []
  }

  /**
   * 设置选区的锚点位置
   * @param slot 锚点位置的插槽
   * @param offset 锚点位置索引
   */
  setAnchor(slot: Slot, offset: number) {
    if (this.controller.readonly) {
      return
    }
    this._anchorSlot = slot
    slot.retain(offset)
    this._anchorOffset = slot.index
    this.resetStartAndEndPosition()
  }

  /**
   * 设置选区焦点位置
   * @param slot 焦点位置的插槽
   * @param offset 焦点位置的索引
   */
  setFocus(slot: Slot, offset: number) {
    if (this.controller.readonly) {
      return
    }
    this._focusSlot = slot
    slot.retain(offset)
    this._focusOffset = slot.index
    this.resetStartAndEndPosition()
  }

  /**
   * 设置选区位置
   * @param slot 选区所以插槽
   * @param offset 选区位置索引
   */
  setPosition(slot: Slot, offset: number) {
    if (this.controller.readonly) {
      return
    }
    this._focusSlot = this._anchorSlot = slot
    slot.retain(offset)
    this._focusOffset = this._anchorOffset = slot.index
    this.resetStartAndEndPosition()
  }

  /**
   * 设置选区选择插槽的全部内容
   * @param slot
   */
  selectSlot(slot: Slot) {
    this.setBaseAndExtent(slot, 0, slot, slot.length)
  }

  /**
   * 设置选区为组件的第一个位置
   * @param componentInstance
   * @param isRestore
   */
  selectFirstPosition(componentInstance: ComponentInstance, isRestore = false) {
    const slots = componentInstance.slots
    if (slots.length) {
      const first = slots.first!
      const { slot, offset } = this.findFirstPosition(first, false)
      this.setBaseAndExtent(slot, offset, slot, offset)
    } else {
      this.selectComponentFront(componentInstance)
    }
    if (isRestore) {
      this.restore()
    }
  }

  /**
   * 设置选区为组件的最后一个位置
   * @param componentInstance
   * @param isRestore
   */
  selectLastPosition(componentInstance: ComponentInstance, isRestore = false) {
    const slots = componentInstance.slots
    if (slots.length) {
      const last = slots.last!
      const { slot, offset } = this.findLastPosition(last, false)
      this.setBaseAndExtent(slot, offset, slot, offset)
    } else {
      this.selectComponentEnd(componentInstance)
    }
    if (isRestore) {
      this.restore()
    }
  }

  /**
   * 把选区设置在组件之前
   * @param componentInstance
   * @param isRestore
   */
  selectComponentFront(componentInstance: ComponentInstance, isRestore = false) {
    const parent = componentInstance.parent
    if (parent) {
      const index = parent.indexOf(componentInstance)
      this.setBaseAndExtent(parent, index, parent, index)
    } else {
      this.unSelect()
    }
    if (isRestore) {
      this.restore()
    }
  }

  /**
   * 把选区设置在组件之后
   * @param componentInstance
   * @param isRestore
   */
  selectComponentEnd(componentInstance: ComponentInstance, isRestore = false) {
    const parent = componentInstance.parent
    if (parent) {
      const index = parent.indexOf(componentInstance)
      this.setBaseAndExtent(parent, index + 1, parent, index + 1)
    } else {
      this.unSelect()
    }
    if (isRestore) {
      this.restore()
    }
  }

  /**
   * 选中组件所有的子插槽
   * @param componentInstance
   * @param isRestore
   */
  selectChildSlots(componentInstance: ComponentInstance, isRestore = false) {
    const slots = componentInstance.slots
    if (slots.length) {
      const firstPosition = this.findFirstPosition(slots.first!, false)
      const lastPosition = this.findLastPosition(slots.last!, false)
      this.setBaseAndExtent(firstPosition.slot, firstPosition.offset, lastPosition.slot, lastPosition.offset)
    } else {
      this.selectComponent(componentInstance, false)
    }
    if (isRestore) {
      this.restore()
    }
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
      this.setBaseAndExtent(parent, index, parent, index + 1)
      if (isRestore) {
        this.restore()
      }
    }
  }

  /**
   * 获取选区所选择的块的集合
   * @param decompose 是否按块分解已选中的区域
   */
  getSelectedScopes(decompose = false): SlotRange[] {
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
    const scopes = this.getScopes(this.startSlot!, this.startOffset!, this.endSlot!, this.endOffset!, true)
    if (decompose) {
      const ranges: SlotRange[] = []
      scopes.forEach(i => {
        ranges.push(...this.decomposeSlotRange(i.slot, i.startIndex, i.endIndex))
      })
      return ranges
    }
    return scopes
  }

  /**
   * 把光标移动到前一个位置
   */
  toPrevious() {
    if (!this.isCollapsed) {
      this.collapse(true)
      this.restore()
      return
    }
    const { startSlot, startOffset } = this
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
        const event = new Event(content, null)
        invokeListener(content, 'onSelectionFromEnd', event)
        if (!event.isPrevented) {
          if (content.slots.length === 0) {
            this.selectComponent(content)
          }
        } else {
          this.setPosition(startSlot!, startOffset!)
        }
      }
      this.restore()
    }
  }

  /**
   * 把光标移动到后一个位置
   */
  toNext() {
    if (!this.isCollapsed) {
      this.collapse()
      this.restore()
      return
    }
    const { endSlot, endOffset } = this
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
        const event = new Event(content, null)
        invokeListener(content, 'onSelectionFromFront', event)
        if (!event.isPrevented) {
          if (content.slots.length === 0) {
            this.selectComponent(content)
          }
        } else {
          this.setPosition(endSlot!, endOffset!)
        }
      }
      this.restore()
    }
  }

  /**
   * 把光标移动到上一行
   */
  toPreviousLine() {
    const previousLinePosition = this.bridge.getPreviousLinePositionByCurrent({
      slot: this.focusSlot!,
      offset: this.focusOffset!
    })
    if (previousLinePosition) {
      this.setPosition(previousLinePosition.slot, previousLinePosition.offset)
      this.restore()
    }
  }

  /**
   * 把光标移动到下一行
   */
  toNextLine() {
    const nextLinePosition = this.bridge.getNextLinePositionByCurrent({
      slot: this.focusSlot!,
      offset: this.focusOffset!
    })
    if (nextLinePosition) {
      this.setPosition(nextLinePosition.slot, nextLinePosition.offset)
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
  wrapToPreviousLine() {
    const previousLinePosition = this.bridge.getPreviousLinePositionByCurrent({
      slot: this.focusSlot!,
      offset: this.focusOffset!
    })
    if (previousLinePosition) {
      this.setFocus(previousLinePosition.slot, previousLinePosition.offset)
      this.restore()
    }
  }

  /**
   * 向下一行框选
   */
  wrapToNextLine() {
    const nextLinePosition = this.bridge.getNextLinePositionByCurrent({
      slot: this.focusSlot!,
      offset: this.focusOffset!
    })
    if (nextLinePosition) {
      this.setFocus(nextLinePosition.slot, nextLinePosition.offset)
      this.restore()
    }
  }

  /**
   * 闭合选区
   * @param toStart 是否闭合到结束位置
   */
  collapse(toStart = false) {
    if (toStart) {
      this.setPosition(this.startSlot!, this.startOffset!)
    } else {
      this.setPosition(this.endSlot!, this.endOffset!)
    }
  }

  /**
   * 立即同步 Textbus 选区到原生选区
   */
  restore(fromLocal = true) {
    if (this.nativeSelectionDelegate) {
      const focusSlot = this.focusSlot!
      const focusOffset = this.focusOffset!
      const anchorSlot = this.anchorSlot!
      const anchorOffset = this.anchorOffset!
      if (focusSlot && anchorSlot) {
        focusSlot.retain(focusOffset)
        anchorSlot.retain(anchorOffset)
        this.bridge.restore({
          focusOffset: focusOffset,
          focusSlot: focusSlot,
          anchorOffset: anchorOffset,
          anchorSlot: anchorSlot
        }, fromLocal)
      } else {
        this.bridge.restore(null, fromLocal)
      }
    }
  }

  /**
   * 获取当前选区在文档中的路径
   */
  getPaths(): SelectionPaths {
    if (!this.isSelected) {
      return {
        anchor: [],
        focus: [],
      }
    }
    const anchor = this.getPathsBySlot(this.anchorSlot!) || []
    anchor.push(this.anchorOffset!)
    const focus = this.getPathsBySlot(this.focusSlot!) || []
    focus.push(this.focusOffset!)
    return {
      anchor,
      focus,
    }
  }

  /**
   * 把选区设置为指定的路径
   * @param paths
   */
  usePaths(paths: SelectionPaths) {
    const anchorPosition = this.findPositionByPath(paths.anchor)
    const focusPosition = this.findPositionByPath(paths.focus)
    if (anchorPosition && focusPosition) {
      this.setBaseAndExtent(anchorPosition.slot, anchorPosition.offset, focusPosition.slot, focusPosition.offset)
    }
  }

  /**
   * 取消选区
   */
  unSelect() {
    this._anchorSlot = this._focusSlot = this._anchorOffset = this._focusOffset = null
    this.resetStartAndEndPosition()
    this.restore()
  }

  /**
   * 选择整个文档
   */
  selectAll() {
    const slot = this.root.component.slots.get(0)!
    this.setBaseAndExtent(slot, 0, slot, slot.length)
    this.restore()
  }

  /**
   * 获取下一个选区位置。
   */
  getNextPosition(): SelectionPosition | null {
    if (!this.isSelected) {
      return null
    }
    return this.getNextPositionByPosition(this.focusSlot!, this.focusOffset!)
  }

  /**
   * 获取上一个选区位置。
   */
  getPreviousPosition(): SelectionPosition | null {
    if (!this.isSelected) {
      return null
    }
    return this.getPreviousPositionByPosition(this.focusSlot!, this.focusOffset!)
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
    if (paths.length === 0) {
      return this.root.component
    }
    const result = Selection.findTreeNode(paths, this.root.component)
    if (result instanceof Slot) {
      return null
    }
    return result
  }

  /**
   * 获取选区内所有的块集合
   */
  getBlocks(): SlotRange[] {
    const blocks: SlotRange[] = []
    if (!this.isSelected) {
      return blocks
    }

    const scopes = this.getGreedyRanges()

    scopes.forEach(i => {
      blocks.push(...this.decomposeSlotRange(i.slot, i.startIndex, i.endIndex))
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

    let startOffset: number
    let endOffset: number

    while (true) {
      const parent = startSlot.parent
      if (parent === ancestorComponent) {
        startOffset = parent.slots.indexOf(startSlot)
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
        endOffset = parent.slots.indexOf(endSlot) + 1
        break
      }
      if (parent?.parent) {
        endSlot = parent.parent
      } else {
        return null
      }
    }

    if (startOffset >= 0 && endOffset >= 1) {
      return {
        startOffset,
        endOffset,
        component: ancestorComponent
      }
    }
    return null
  }

  /**
   * 获取当前选区在开始和结束位置均扩展到最大行内内容位置是的块
   */
  getGreedyRanges(): SlotRange[] {
    if (!this.isSelected) {
      return []
    }
    return this.getScopes(this.startSlot!,
      Selection.getInlineContentStartIndex(this.startSlot!, this.startOffset!),
      this.endSlot!,
      Selection.getInlineContentEndIndex(this.endSlot!, this.endOffset!))
  }

  /**
   * 查找插槽内最深的第一个光标位置
   * @param slot
   * @param toChild
   */
  findFirstPosition(slot: Slot, toChild = true): SelectionPosition {
    const first = slot.getContentAtIndex(0)
    if (toChild && first && typeof first !== 'string') {
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
   * @param toChild
   */
  findLastPosition(slot: Slot, toChild = true): SelectionPosition {
    const last = slot.getContentAtIndex(slot.length - 1)
    if (toChild && last && typeof last !== 'string') {
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
    let startOffset = this.startOffset!
    let endOffset = this.endOffset!
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
      startOffset = startSlot.indexOf(startChildComponent)
    }

    while (endSlot !== commonAncestorSlot) {
      endChildComponent = endSlot.parent!
      if (endChildComponent === commonAncestorComponent) {
        endChildSlot = endSlot
      }
      endSlot = endChildComponent.parent!
      endOffset = endSlot.indexOf(endChildComponent)
    }

    return {
      startOffset: startOffset,
      startSlot,
      startChildComponent,
      endOffset: endOffset + 1,
      endSlot,
      endChildComponent,
      startChildSlot,
      endChildSlot
    }
  }

  /**
   * 获取插槽在文档中的绝对路径
   * @param slot
   */
  getPathsBySlot(slot: Slot): number[] | null {
    const paths: number[] = []

    while (true) {
      const parentComponent = slot.parent
      if (!parentComponent) {
        return null
      }
      const slotIndex = parentComponent.slots.indexOf(slot)
      paths.push(slotIndex)

      const parentSlot = parentComponent.parent
      if (!parentSlot) {
        if (parentComponent !== this.root.component) {
          return null
        }
        break
      }
      const componentIndex = parentSlot.indexOf(parentComponent)
      paths.push(componentIndex)
      slot = parentSlot
    }
    return paths.length ? paths.reverse() : null
  }

  /**
   * 根据当前位置获取下一个光标位置
   * @param slot
   * @param offset
   */
  getNextPositionByPosition(slot: Slot, offset: number) {
    if (offset === slot.length - 1) {
      const current = slot.getContentAtIndex(offset)
      if (current === '\n') {
        offset++
      }
    }
    if (offset < slot.length) {
      const current = slot.getContentAtIndex(offset)

      if (typeof current !== 'string') {
        const firstChildSlot = current.slots.get(0)
        if (firstChildSlot) {
          return this.findFirstPosition(firstChildSlot)
        }
      }
      return {
        slot,
        offset: offset + current.length
      }
    }

    // 循环向后找最后一个子 slot，但有可能当前这个就是最后一个，这时循环
    // 向上会找不到，那么就使用当前的 slot
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
      if (componentIndex < parentSlot.length) {
        if (parentComponent.type !== ContentType.BlockComponent) {
          return {
            slot: parentSlot,
            offset: componentIndex + 1
          }
        }
        const nextContent = parentSlot.getContentAtIndex(componentIndex + 1)
        if (nextContent) {
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
        }
      }
      slot = parentSlot
    }
    return {
      slot: cacheSlot,
      offset: this.endOffset!
    }
  }

  /**
   * 根据当前位置，获取下一个光标位置
   * @param slot
   * @param offset
   */
  getPreviousPositionByPosition(slot: Slot, offset: number) {
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
        offset: offset - prev.length
      }
    }
    // 循环向前找第一个子 slot，但有可能当前这个就是第一个，这时循环向上会找不到，那么就使用当前的 slot
    let cacheSlot = slot

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
      }
      slot = parentSlot
      cacheSlot = slot
    }
    return {
      slot: cacheSlot,
      offset: 0
    }
  }

  /**
   * 根据指定的开始位置和结束位置，获取选区中片段
   * @param startSlot
   * @param startIndex
   * @param endSlot
   * @param endIndex
   * @param discardEmptyScope
   */
  getScopes(
    startSlot: Slot,
    startIndex: number,
    endSlot: Slot,
    endIndex: number,
    discardEmptyScope = false) {
    const commonAncestorSlot = Selection.getCommonAncestorSlot(startSlot, endSlot)
    const commonAncestorComponent = Selection.getCommonAncestorComponent(startSlot, endSlot)
    return this.getScopesByRange(
      startSlot,
      startIndex,
      endSlot,
      endIndex,
      commonAncestorSlot,
      commonAncestorComponent,
      discardEmptyScope
    )
  }

  /**
   * 根据开始插槽和结束插槽获取最近的公共父组件
   * @param startSlot
   * @param endSlot
   */
  static getCommonAncestorComponent(startSlot: Slot | null, endSlot: Slot | null) {
    let startComponent = startSlot?.parent
    let endComponent = endSlot?.parent
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

  /**
   * 根据开始插槽和结束插槽获取最近的公共父插槽
   * @param startSlot
   * @param endSlot
   */
  static getCommonAncestorSlot(startSlot: Slot | null, endSlot: Slot | null) {
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
   * 比较两个绝对路径的前后，当 minPaths 小于 maxPaths 时，返回 true，否则返回 false
   * @param minPaths 假定的小路径
   * @param maxPaths 假定的大路径
   * @param canEqual minPaths 和 maxPaths 是否可以相等
   */
  static compareSelectionPaths(minPaths: number[], maxPaths: number[], canEqual = true): boolean {
    let minIsStart = true
    let i = 0
    while (true) {
      if (i < maxPaths.length) {
        if (i < minPaths.length) {
          const min = minPaths[i]
          const max = maxPaths[i]
          if (min === max) {
            if (i === maxPaths.length - 1 && i === minPaths.length - 1) {
              return canEqual
            }
            i++
            continue
          }
          minIsStart = min < max
          break
        } else {
          minIsStart = true
          break
        }
      } else {
        minIsStart = false
        break
      }
    }
    return minIsStart
  }

  /**
   * 获取插槽指定位置之前的非 BlockComponent 内容
   * @param slot
   * @param index
   */
  static getInlineContentStartIndex(slot: Slot, index: number) {
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

  /**
   * 获取插槽指定位置之后的非 BlockComponent 内容
   * @param slot
   * @param index
   */
  static getInlineContentEndIndex(slot: Slot, index: number) {
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

  private decomposeSlotRange(slot: Slot, startIndex: number, endIndex: number) {
    const scopes: SlotRange[] = []
    if (startIndex >= endIndex) {
      return scopes
    }
    let newScope: SlotRange | null = null

    let i = 0
    const contents = slot.sliceContent(startIndex, endIndex)
    contents.forEach(c => {
      if (typeof c !== 'string' && c.type === ContentType.BlockComponent && c.slots.length !== 0) {
        newScope = null
        c.slots.toArray().forEach(s => {
          scopes.push(...this.decomposeSlotRange(s, 0, s.length))
        })
      } else if (!newScope) {
        newScope = {
          startIndex: startIndex + i,
          endIndex: startIndex + i + c.length,
          slot: slot
        }
        scopes.push(newScope)
      } else {
        newScope.endIndex = startIndex + i + c.length
      }
      i += c.length
    })
    return scopes
  }

  private resetStartAndEndPosition() {
    let focusPaths: number[] = []
    let anchorPaths: number[] = []
    if (this.focusSlot) {
      const _focusPaths = this.getPathsBySlot(this.focusSlot)
      if (_focusPaths) {
        focusPaths = _focusPaths
        focusPaths.push(this.focusOffset!)
      } else {
        this._focusSlot = this._focusOffset = null
      }
    }
    if (this.anchorSlot) {
      const _anchorPaths = this.getPathsBySlot(this.anchorSlot)
      if (_anchorPaths) {
        anchorPaths = _anchorPaths
        anchorPaths.push(this.anchorOffset!)
      } else {
        this._anchorSlot = this._anchorOffset = null
      }
    }

    const anchorSlotIsStart = Selection.compareSelectionPaths(anchorPaths, focusPaths)
    if (anchorSlotIsStart) {
      this._startSlot = this.anchorSlot
      this._startOffset = this.anchorOffset
      this._endSlot = this.focusSlot
      this._endOffset = this.focusOffset
    } else {
      this._endSlot = this.anchorSlot
      this._endOffset = this.anchorOffset
      this._startSlot = this.focusSlot
      this._startOffset = this.focusOffset
    }
    this._commonAncestorSlot = Selection.getCommonAncestorSlot(this.startSlot, this.endSlot)
    this._commonAncestorComponent = Selection.getCommonAncestorComponent(this.startSlot, this.endSlot)
    this.broadcastChanged()
  }

  private wrapTo(toLeft: boolean) {
    if (!this.isSelected) {
      return
    }
    const position = toLeft ?
      this.getPreviousPositionByPosition(this.focusSlot!, this.focusOffset!) :
      this.getNextPositionByPosition(this.focusSlot!, this.focusOffset!)
    this.setBaseAndExtent(this.anchorSlot!, this.anchorOffset!, position.slot, position.offset)
    this.restore()
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
      focusSlot: this.focusSlot!,
      anchorSlot: this.anchorSlot!,
      focusOffset: this.focusOffset!,
      anchorOffset: this.anchorOffset!
    } : null)
  }

  private getScopesByRange(
    startSlot: Slot,
    startIndex: number,
    endSlot: Slot,
    endIndex: number,
    commonAncestorSlot,
    commonAncestorComponent,
    discardEmptyScope = false): SlotRange[] {

    const start: SlotRange[] = []
    const end: SlotRange[] = []
    let startParentComponent: ComponentInstance | null = null
    let endParentComponent: ComponentInstance | null = null

    let startSlotRefIndex: number | null = null
    let endSlotRefIndex: number | null = null

    if (this.customRanges) {
      return this.customRanges
    }


    while (startSlot !== commonAncestorSlot) {
      start.push({
        startIndex,
        endIndex: startSlot.length,
        slot: startSlot
      })

      startParentComponent = startSlot.parent!

      const childSlots = startParentComponent.slots
      const end = childSlots.indexOf(endSlot!)
      startSlotRefIndex = childSlots.indexOf(startSlot)
      if (startParentComponent !== commonAncestorComponent && end === -1) {
        start.push(...childSlots.slice(startSlotRefIndex! + 1, childSlots.length).map(slot => {
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
      const index = childSlots.indexOf(startSlot!)

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
    const result: Omit<SlotRange, 'isStart' | 'isEnd'>[] = [...start]
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

    if (discardEmptyScope) {
      return result.filter(item => {
        return item.slot && item.startIndex < item.endIndex
      })
    }
    return result
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
}
