import { Observable, Subject, Subscription } from '@tanbo/stream'
import { Draft, Patch, produce } from 'immer'

import { ComponentInstance, ComponentLiteral } from './component'
import { Action, ApplyAction } from './operation'
import { Content } from './content'
import { Format, FormatLiteral, FormatRange, FormatValue, Formats } from './format'
import { BlockFormatter, Formatter, FormatType, InlineFormatter } from './formatter'
import { ChangeMarker } from './change-marker'
import { StateChange } from './types'

export enum ContentType {
  Text = 1,
  InlineComponent,
  BlockComponent
}

export interface SlotLiteral<T = any> {
  schema: ContentType[]
  content: Array<string | ComponentLiteral>
  formats: FormatLiteral
  state: T | null
}

export interface DeltaInsert {
  insert: string | ComponentInstance
  formats: Formats
}

export type DeltaLite = DeltaInsert[]

function formatsToObject(formats: Formats) {
  const obj: Record<string, any> = {}
  formats.forEach(item => {
    const [formatter, value] = item
    const name = formatter.name
    if (formatter.createValueIdIfOverlap) {
      if (obj[name]) {
        obj[name].push(value)
      } else {
        obj[name] = [value]
      }
    } else {
      obj[name] = value
    }
  })
  return obj
}

/**
 * Textbus 插槽类，用于管理组件、文本及格式的增删改查
 */
export class Slot<T = any> {
  static placeholder = '\u200b'

  static get emptyPlaceholder() {
    // return this.schema.includes(ContentType.BlockComponent) ? '\n' : '\u200b'
    return '\n'
  }

  /** 插槽所属的组件 */
  parent: ComponentInstance | null = null
  /** 插槽变更标记器 */
  changeMarker = new ChangeMarker()

  onContentChange: Observable<Action[]>
  onStateChange: Observable<StateChange<T>>
  onChildComponentRemove: Observable<ComponentInstance[]>

  readonly schema: ContentType[]

  private componentChangeListeners = new WeakMap<ComponentInstance, Subscription>()
  private childComponentRemoveEvent = new Subject<ComponentInstance[]>()

  get parentSlot() {
    return this.parent?.parent || null
  }

  /** 插槽内容长度 */
  get length() {
    return this.content.length
  }

  /** 插槽内容是否为空 */
  get isEmpty() {
    return this.length === 1 && this.getContentAtIndex(0) === Slot.emptyPlaceholder
  }

  /** 插槽当前下标位置 */
  get index() {
    return this.isEmpty ? 0 : this._index
  }

  /** 插槽的 id，用于优化 diff 算法 */
  readonly id = Math.random()

  protected _index = 0

  protected content = new Content()
  protected format = new Format(this)

  protected contentChangeEvent = new Subject<Action[]>()
  protected stateChangeEvent = new Subject<StateChange<T>>()

  constructor(schema: ContentType[], public state?: T) {
    this.schema = schema.sort()
    this.onContentChange = this.contentChangeEvent.asObservable()
    this.onStateChange = this.stateChangeEvent.asObservable()
    this.onChildComponentRemove = this.childComponentRemoveEvent.asObservable()
    this.content.append(Slot.emptyPlaceholder)
    this._index = 0
  }

  /**
   * 设置块级格式
   * @param formatter
   * @param value
   */
  setAttribute(formatter: BlockFormatter, value: FormatValue) {
    this.applyFormat(formatter, value)
  }

  /**
   * 获取块级格式的值
   * @param formatter
   */
  getAttribute(formatter: BlockFormatter) {
    const ranges = this.getFormatRangesByFormatter(formatter, 0, this.length)
    if (ranges.length) {
      return ranges[0].value
    }
    return null
  }

  /**
   * 删除块级格式
   * @param formatter
   */
  removeAttribute(formatter: BlockFormatter) {
    this.applyFormat(formatter, null)
  }

  /**
   * 根据指定 formatter 查询是否包含块级格式
   * @param formatter
   */
  hasAttribute(formatter: BlockFormatter) {
    return this.getAttribute(formatter) !== null
  }

  /**
   * 更新插槽状态的方法
   * @param fn
   * @param record
   */
  updateState(fn: (draft: Draft<T>) => void, record = true): T {
    let changes!: Patch[]
    let inverseChanges!: Patch[]
    const oldState = this.state
    const newState = produce(oldState, fn, (p, ip) => {
      changes = p
      inverseChanges = ip
    })
    if (changes.length === 0 && inverseChanges.length === 0) {
      return oldState!
    }
    this.state = newState
    const applyAction: ApplyAction = {
      type: 'apply',
      patches: changes,
      value: newState,
      record
    }
    this.changeMarker.markAsDirtied({
      path: [],
      apply: [applyAction],
      unApply: [{
        type: 'apply',
        patches: inverseChanges,
        value: oldState,
        record
      }]
    })
    this.stateChangeEvent.next({
      newState: newState!,
      oldState: oldState!,
      record
    })
    return newState!
  }

  /**
   * 向插槽内写入内容，并根据当前位置的格式，自动扩展
   * @param content
   * @param formats
   */
  write(content: string | ComponentInstance, formats?: Formats): boolean
  write(content: string | ComponentInstance, formatter?: Formatter, value?: FormatValue): boolean
  write(content: string | ComponentInstance, formatter?: Formatter | Formats, value?: FormatValue): boolean {
    const index = this.index
    const expandFormat = (this.isEmpty || index === 0) ? this.format.extract(0, 1) : this.format.extract(index - 1, index)

    const formats: Formats = expandFormat.toArray().map(i => {
      return [
        i.formatter,
        i.value
      ]
    })
    if (formatter) {
      if (Array.isArray(formatter)) {
        formats.push(...formatter)
      } else {
        formats.push([formatter, value as FormatValue])
      }
    }
    return this.insert(content, formats)
  }

  /**
   * 向插槽内写入内容，并可同时应用格式
   * @param content
   * @param formats
   */
  insert(content: string | ComponentInstance, formats?: Formats): boolean
  insert(content: string | ComponentInstance, formatter?: Formatter, value?: FormatValue): boolean
  insert(content: string | ComponentInstance, formatter?: Formatter | Formats, value?: FormatValue): boolean {
    const contentType = typeof content === 'string' ? ContentType.Text : content.type
    if (!this.schema.includes(contentType)) {
      return false
    }

    const prevContent = this.getContentAtIndex(this.index - 1)
    if (prevContent === Slot.placeholder) {
      this.retain(this.index - 1)
      this.delete(1)
    }

    const isEmpty = this.isEmpty
    let actionData: string | ComponentLiteral
    let length: number
    const startIndex = this.index

    if (typeof content === 'string') {
      if (content.length === 0) {
        return true
      }
      actionData = content
      length = content.length
    } else {
      length = 1
      actionData = content.toJSON()
      if (content.parent) {
        content.parent.removeComponent(content)
      }
      content.parent = this
      const sub = content.changeMarker.onChange.subscribe(ops => {
        ops.path.unshift(this.indexOf(content))
        this.changeMarker.markAsChanged(ops)
      })
      sub.add(content.changeMarker.onChildComponentRemoved.subscribe(instance => {
        this.changeMarker.recordComponentRemoved(instance)
      }))
      sub.add(content.changeMarker.onForceChange.subscribe(() => {
        this.changeMarker.forceMarkChanged()
      }))
      this.componentChangeListeners.set(content, sub)
    }
    let formats: Formats = []
    if (formatter) {
      if (Array.isArray(formatter)) {
        formats = formatter
      } else {
        formats.push([formatter, value as FormatValue])
      }
    }
    if (!isEmpty) {
      formats = formats.filter(i => {
        return i[0].type !== FormatType.Block
      })
    }
    this.format.split(startIndex, length)

    this.content.insert(startIndex, content)
    this.applyFormats(formats, startIndex, length)

    if (isEmpty && this._index === 0) {
      const len = this.length - 1
      this.content.cut(len)
      this.format.shrink(len, 1)
    }

    this._index = startIndex + length

    const applyActions: Action[] = [{
      type: 'retain',
      offset: startIndex
    }, formats.length ? {
      type: 'insert',
      content: actionData,
      ref: content,
      formats: formatsToObject(formats)
    } : {
      type: 'insert',
      content: actionData,
      ref: content
    }]

    this.changeMarker.markAsDirtied({
      path: [],
      apply: applyActions,
      unApply: [{
        type: 'retain',
        offset: startIndex
      }, {
        type: 'delete',
        count: length
      }]
    })
    this.contentChangeEvent.next(applyActions)
    return true
  }

  /**
   * 如果没有传入格式参数，则移动插槽下标到 offset
   * 如果有传入格式参数，则以当前下标位置向后增加 offset 的区间内设置样式
   * @param offset
   */
  retain(offset: number): boolean
  retain(offset: number, formats: Formats): boolean
  retain(offset: number, formatter: Formatter, value: FormatValue | null): boolean
  retain(offset: number, formatter?: Formatter | Formats, value?: FormatValue | null): boolean {
    let formats: Formats = []
    if (formatter) {
      if (Array.isArray(formatter)) {
        if (formatter.length === 0) {
          return true
        }
        formats = formatter
      } else {
        formats.push([formatter, value as FormatValue])
      }
    }
    const len = this.length
    if (formats.length === 0) {
      if (offset < 0) {
        offset = 0
      }
      if (offset > len) {
        offset = len
      }
      this._index = this.content.fixIndex(offset)
      return true
    }

    const startIndex = this._index
    let endIndex = this.content.fixIndex(startIndex + offset)
    if (endIndex > len) {
      endIndex = len
    }

    let index = startIndex

    const applyActions: Action[] = []
    const unApplyActions: Action[] = []
    const formatsObj = formatsToObject(formats)
    const resetFormatObj = formats.reduce((opt: Record<string, any>, next) => {
      opt[next[0].name] = null
      return opt
    }, {})
    this.content.slice(startIndex, endIndex).forEach(content => {
      const offset = content.length
      if (typeof content === 'string' || content.type !== ContentType.BlockComponent) {
        const deletedFormat = this.format.extract(index, index + offset)
        this.applyFormats(formats, index, offset)
        applyActions.push({
          type: 'retain',
          offset: index
        }, {
          type: 'retain',
          offset: offset,
          formats: {
            ...formatsObj
          }
        })
        unApplyActions.push({
          type: 'retain',
          offset: index
        }, {
          type: 'retain',
          offset: offset,
          formats: resetFormatObj
        }, ...Slot.createActionByFormat(deletedFormat))
      } else {
        content.slots.toArray().forEach(slot => {
          slot.retain(0)
          slot.retain(slot.length, formats)
        })
      }
      index += offset
    })
    if (applyActions.length || unApplyActions.length) {
      this.changeMarker.markAsDirtied({
        path: [],
        apply: applyActions,
        unApply: unApplyActions
      })
      if (applyActions.length) {
        this.contentChangeEvent.next(applyActions)
      }
    }
    return true
  }

  /**
   * 从当前位置向后删除指定长度的内容
   * @param count
   */
  delete(count: number): boolean {
    if (count <= 0) {
      return false
    }
    const startIndex = this._index
    let endIndex = this._index + count
    if (endIndex > this.length) {
      endIndex = this.length
    }
    const deletedData = this.content.cut(startIndex, endIndex)
    const deletedFormat = this.format.extract(startIndex, endIndex)

    this.format.shrink(startIndex, count)

    if (this.length === 0) {
      this.content.append(Slot.emptyPlaceholder)
      this.format = deletedFormat.extract(0, 1)
    }

    const applyActions: Action[] = [{
      type: 'retain',
      offset: startIndex
    }, {
      type: 'delete',
      count
    }]
    const deletedComponents: ComponentInstance[] = []
    this.changeMarker.markAsDirtied({
      path: [],
      apply: applyActions,
      unApply: [{
        type: 'retain',
        offset: startIndex
      }, ...deletedData.map<Action>(item => {
        if (typeof item === 'string') {
          return {
            type: 'insert',
            content: item,
            ref: item
          }
        }
        deletedComponents.push(item)
        this.changeMarker.recordComponentRemoved(item)
        this.componentChangeListeners.get(item)?.unsubscribe()
        this.componentChangeListeners.delete(item)
        item.parent = null
        return {
          type: 'insert',
          content: item.toJSON(),
          ref: item
        }
      }), ...Slot.createActionByFormat(deletedFormat)]
    })
    this.contentChangeEvent.next(applyActions)
    if (deletedComponents.length) {
      this.childComponentRemoveEvent.next(deletedComponents)
    }
    return true
  }

  /**
   * 给插槽应用新的格式，如果为块级样式，则应用到整个插槽，否则根据参数配置的范围应用
   * @param formatter
   * @param data
   */
  applyFormat(formatter: BlockFormatter, data: FormatValue): void
  applyFormat(formatter: InlineFormatter, data: FormatRange): void
  applyFormat(formatter: Formatter, data: FormatValue | FormatRange): void {
    if (formatter.type === FormatType.Block) {
      this.retain(0)
      this.retain(this.length, formatter, data as FormatValue)
    } else {
      this.retain((data as FormatRange).startIndex)
      this.retain((data as FormatRange).endIndex - (data as FormatRange).startIndex, formatter, (data as FormatRange).value)
    }
  }

  /**
   * 在当前插槽内删除指定的组件
   * @param component
   */
  removeComponent(component: ComponentInstance) {
    const index = this.indexOf(component)
    if (index > -1) {
      this.retain(index)
      return this.delete(1)
    }
    return false
  }

  /**
   * 剪切插槽内指定范围的内容
   * @param startIndex
   * @param endIndex
   */
  cut(startIndex = 0, endIndex = this.length): Slot {
    return this.cutTo(new Slot(this.schema, this.state), startIndex, endIndex)
  }

  /**
   * 把当前插槽内指定范围的内容剪切到新插槽
   * @param slot 新插槽
   * @param startIndex
   * @param endIndex
   */
  cutTo<U extends Slot>(slot: U, startIndex = 0, endIndex = this.length): U {
    if (startIndex < 0) {
      startIndex = 0
    }
    const length = this.length
    if (endIndex > length) {
      endIndex = length
    }
    if (startIndex > endIndex) {
      return slot
    }
    if (this.isEmpty) {
      slot.format = this.format.createFormatByRange(slot, 0, 1)
      this.retain(startIndex)
      this.delete(endIndex - startIndex)
      return slot
    }
    if (startIndex === length || startIndex === length - 1 && this.content.getContentAtIndex(length - 1) === '\n') {
      slot.format = this.format.createFormatByRange(slot, startIndex - 1, startIndex)
      this.retain(startIndex)
      this.delete(endIndex - startIndex)
      return slot
    }
    this.retain(startIndex)
    const _endIndex = this.content.fixIndex(endIndex)
    if (endIndex - _endIndex === 1) {
      endIndex++
    }
    const deletedData = this.content.slice(this.index, endIndex)
    const deletedFormat = this.format.createFormatByRange(slot, this.index, endIndex)

    this.delete(endIndex - this.index)

    const temporarySlot = new Slot([
      ...slot.schema
    ])

    deletedData.forEach(i => {
      temporarySlot.insert(i)
    })
    temporarySlot.format = deletedFormat.createFormatByRange(temporarySlot, 0, temporarySlot.length)
    if (!slot.isEmpty) {
      temporarySlot.format.toArray().forEach(i => {
        const f = i.formatter
        if (f.type === FormatType.Block) {
          temporarySlot.removeAttribute(f)
        }
      })
    }
    temporarySlot.toDelta().forEach(item => {
      slot.insert(item.insert, item.formats)
    })
    return slot
  }

  /**
   * 查找组件在插槽内的索引
   * @param component
   */
  indexOf(component: ComponentInstance) {
    return this.content.indexOf(component)
  }

  /**
   * 查找指定下标位置的内容
   * @param index
   */
  getContentAtIndex(index: number) {
    return this.content.getContentAtIndex(index)
  }

  /**
   * 切分出插槽内指定范围的内容
   * @param startIndex
   * @param endIndex
   */
  sliceContent(startIndex = 0, endIndex = this.length) {
    return this.content.slice(startIndex, endIndex)
  }

  /**
   * 根据插槽的格式数据，生成格式树
   */
  createFormatTree() {
    return this.format.toTree(0, this.length)
  }

  /**
   * 获取传入格式在插槽指定内范围的集合
   * @param formatter 指定的格式
   * @param startIndex
   * @param endIndex
   */
  getFormatRangesByFormatter(formatter: Formatter, startIndex: number, endIndex: number) {
    return this.format.extractFormatRangesByFormatter(startIndex, endIndex, formatter)
  }

  /**
   * 获取插槽格式的数组集合
   */
  getFormats() {
    return this.format.toArray()
  }

  /**
   * 提取 index 下标位置的格式
   * @param index
   */
  extractFormatsByIndex(index: number): Formats {
    return this.format.extractFormatsByIndex(index)
  }

  /**
   * 把插槽内容转换为 JSON
   */
  toJSON(): SlotLiteral<T> {
    return {
      schema: this.schema,
      content: this.content.toJSON(),
      formats: this.format.toJSON(),
      state: this.state ?? null
    }
  }

  toString() {
    return this.content.toString()
  }

  /**
   * 将插槽数据转换为 delta 表示
   */
  toDelta(): DeltaLite {
    if (this.length === 0) {
      return []
    }
    const formatGrid = this.format.toGrid()
    const contentGrid = this.content.toGrid()

    const gridSet = new Set<number>([...formatGrid, ...contentGrid])

    const grid = [...gridSet].sort((a, b) => a - b)

    const deltaList: DeltaLite = []

    let startIndex = grid.shift()!
    while (grid.length) {
      const endIndex = grid.shift()!
      deltaList.push({
        insert: this.content.slice(startIndex, endIndex)[0]!,
        formats: this.format.extract(startIndex, endIndex).toArray().map(i => {
          return [i.formatter, i.value]
        })
      })
      startIndex = endIndex
    }

    return deltaList
  }

  /**
   * 根据 delta 插入内容
   * @param delta
   */
  insertDelta(delta: DeltaLite): DeltaLite {
    while (delta.length) {
      const first = delta[0]!
      const is = this.insert(first.insert, first.formats)
      if (is) {
        delta.shift()
      } else {
        break
      }
    }
    return delta
  }

  /**
   * 清除插槽格式
   * @param excludeFormats 要排除的格式
   * @param startIndex 开始位置
   * @param endIndex 结束位置
   */
  cleanFormats(excludeFormats: Formatter[] = [], startIndex = 0, endIndex = this.length) {
    this.getFormats().forEach(item => {
      if (excludeFormats.includes(item.formatter)) {
        return
      }
      this.retain(startIndex)
      this.retain(endIndex - startIndex, item.formatter, null)
    })
  }

  private applyFormats(formats: Formats, startIndex: number, offset: number) {
    formats.forEach(keyValue => {
      const key = keyValue[0]
      const value = keyValue[1]

      if (key.type === FormatType.Block) {
        this.format.merge(key, value)
      } else {
        this.format.merge(key, {
          startIndex,
          endIndex: startIndex + offset,
          value
        })
      }
    })
  }

  private static createActionByFormat(format: Format) {
    return format.toArray().map<Action[]>(item => {
      return [{
        type: 'retain',
        offset: item.startIndex
      }, {
        type: 'retain',
        offset: item.endIndex - item.startIndex,
        formats: {
          [item.formatter.name]: item.value
        }
      }]
    }).flat()
  }
}
