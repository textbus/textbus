import { Observable, Subject } from '@tanbo/stream'

import { Component, ComponentLiteral } from './component'
import { Content } from './content'
import { Format, FormatLiteral, FormatRange, FormatValue, Formats, FormatTree, FormatItem } from './format'
import { Attribute, FormatHostBindingRender, Formatter } from './attribute'
import { ChangeMarker } from './change-marker'
import { Action } from './types'
import { VElement, VTextNode } from './element'
import { makeError } from '../_utils/make-error'

const slotError = makeError('Slot')

/**
 * 插槽渲染的工厂函数
 */
export interface SlotRenderFactory {
  (children: Array<VElement | VTextNode | Component>): VElement
}

export enum ContentType {
  Text = 1,
  InlineComponent,
  BlockComponent
}

export interface SlotLiteral {
  schema: ContentType[]
  content: Array<string | ComponentLiteral>
  attributes: Record<string, FormatValue>
  formats: FormatLiteral
}

export interface DeltaInsert {
  insert: string | Component
  formats: Formats
}

export class DeltaLite extends Array<DeltaInsert> {
  attributes = new Map<Attribute<any>, any>()
}

/**
 * Textbus 插槽类，用于管理组件、文本及格式的增删改查
 */
export class Slot {
  static placeholder = '\u200b'

  static get emptyPlaceholder() {
    // return this.schema.includes(ContentType.BlockComponent) ? '\n' : '\u200b'
    return '\n'
  }

  /** 插槽变更标记器 */
  __changeMarker__ = new ChangeMarker(this)

  onContentChange: Observable<Action[]>

  readonly schema: ContentType[]

  /** 插槽所属的组件 */
  get parent(): Component | null {
    let parentModel = this.__changeMarker__.parentModel
    while (parentModel) {
      if (parentModel.__changeMarker__.host instanceof Component) {
        return parentModel.__changeMarker__.host
      }
      parentModel = parentModel.__changeMarker__.parentModel
    }
    return null
  }

  get parentSlot(): Slot | null {
    return this.parent?.changeMarker.parentModel as Slot || null
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

  /**
   * @internal
   * 插槽的 id，用于优化 diff 算法
   */
  readonly id = Math.random()

  protected _index = 0

  protected content = new Content()
  protected format = new Format(this)
  protected attributes = new Map<Attribute<any>, any>()

  protected contentChangeEvent = new Subject<Action[]>()

  protected applyFormatCoverChild = false

  constructor(schema: ContentType[]) {
    this.schema = schema.sort()
    this.onContentChange = this.contentChangeEvent.asObservable()
    this.content.append(Slot.emptyPlaceholder)
    this._index = 0
  }

  /**
   * 设置属性
   * @param attribute
   * @param value
   */
  setAttribute(attribute: Attribute<any>, value: FormatValue) {
    const has = this.attributes.has(attribute)
    const v = this.attributes.get(attribute)

    this.attributes.set(attribute, value)
    const applyActions: Action[] = [{
      type: 'attrSet',
      name: attribute.name,
      value
    }]
    this.sliceContent().forEach(item => {
      if (typeof item !== 'string') {
        item.__slots__.forEach(slot => {
          slot.setAttribute(attribute, value)
        })
      }
    })
    this.__changeMarker__.markAsDirtied({
      paths: [],
      apply: applyActions,
      unApply: [has ? {
        type: 'attrSet',
        name: attribute.name,
        value: v
      } : {
        type: 'attrDelete',
        name: attribute.name
      }]
    })
    this.contentChangeEvent.next(applyActions)
  }

  /**
   * 获取属性
   * @param attribute
   */
  getAttribute<T>(attribute: Attribute<T>): T | null {
    return this.attributes.get(attribute) ?? null
  }

  /**
   * 获取所有属性
   */
  getAttributes() {
    return Array.from(this.attributes.entries())
  }

  /**
   * 删除属性
   * @param attribute
   */
  removeAttribute(attribute: Attribute<any>) {
    this.sliceContent().forEach(item => {
      if (typeof item !== 'string') {
        item.__slots__.forEach(slot => {
          slot.removeAttribute(attribute)
        })
      }
    })
    const has = this.attributes.has(attribute)
    if (!has) {
      return
    }
    const v = this.attributes.get(attribute)

    this.attributes.delete(attribute)
    const applyActions: Action[] = [{
      type: 'attrDelete',
      name: attribute.name
    }]
    this.__changeMarker__.markAsDirtied({
      paths: [],
      apply: applyActions,
      unApply: [{
        type: 'attrSet',
        name: attribute.name,
        value: v
      }]
    })
    this.contentChangeEvent.next(applyActions)
  }

  /**
   * 根据是否包含指定 Attribute
   * @param attribute
   */
  hasAttribute(attribute: Attribute<any>) {
    return this.attributes.has(attribute)
  }

  /**
   * 向插槽内写入内容，并根据当前位置的格式，自动扩展
   * @param content
   * @param formats
   */
  write(content: string | Component, formats?: Formats): boolean
  write(content: string | Component, formatter?: Formatter<any>, value?: FormatValue): boolean
  write(content: string | Component, formatter?: Formatter<any> | Formats, value?: FormatValue): boolean {
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
  insert(content: string | Component, formats?: Formats): boolean
  insert(content: string | Component, formatter?: Formatter<any>, value?: FormatValue): boolean
  insert(content: string | Component, formatter?: Formatter<any> | Formats, value?: FormatValue): boolean {
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
      content.changeMarker.parentModel = this
    }
    let formats: Formats = []
    if (formatter) {
      if (Array.isArray(formatter)) {
        formats = formatter
      } else {
        formats.push([formatter, value as FormatValue])
      }
    }
    this.format.split(startIndex, length)

    this.content.insert(startIndex, content)
    this.applyFormats(formats, startIndex, length, false)

    if (isEmpty) {
      const len = this.length - 1
      this.content.cut(len)
      this.format.shrink(len, 1)
    }

    this._index = startIndex + length

    const applyActions: Action[] = [{
      type: 'retain',
      offset: startIndex
    }, formats.length ? {
      type: 'contentInsert',
      content: actionData,
      ref: content,
      formats: formats.reduce((opt: Record<string, any>, next) => {
        opt[next[0].name] = next[1]
        return opt
      }, {})
    } : {
      type: 'contentInsert',
      content: actionData,
      ref: content
    }]

    this.__changeMarker__.markAsDirtied({
      paths: [],
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
  retain(offset: number, formatter: Formatter<any>, value: FormatValue | null): boolean
  retain(offset: number, formatter?: Formatter<any> | Formats, value?: FormatValue | null): boolean {
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
      this._index = this.content.correctIndex(offset, false)
      return true
    }

    const startIndex = this._index
    let endIndex = this.content.correctIndex(startIndex + offset, true)
    if (endIndex > len) {
      endIndex = len
    }

    let index = startIndex

    const applyActions: Action[] = []
    const unApplyActions: Action[] = []
    const formatsObj = formats.reduce((opt: Record<string, any>, next) => {
      opt[next[0].name] = next[1]
      return opt
    }, {})
    const resetFormatObj = formats.reduce((opt: Record<string, any>, next) => {
      opt[next[0].name] = null
      return opt
    }, {})
    this.content.slice(startIndex, endIndex).forEach(content => {
      const offset = content.length
      if (typeof content === 'string' || content.type !== ContentType.BlockComponent) {
        const deletedFormat = this.format.extract(index, index + offset)
        this.applyFormats(formats, index, offset, this.applyFormatCoverChild)
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
        content.__slots__.forEach(slot => {
          if (this.applyFormatCoverChild) {
            slot.background(() => {
              slot.retain(0)
              slot.retain(slot.length, formats)
            })
          } else {
            slot.retain(0)
            slot.retain(slot.length, formats)
          }
        })
      }
      index += offset
    })
    if (applyActions.length || unApplyActions.length) {
      this.__changeMarker__.markAsDirtied({
        paths: [],
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
    let endIndex = this.content.correctIndex(this._index + count, true)
    count = endIndex - startIndex
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
    this.__changeMarker__.markAsDirtied({
      paths: [],
      apply: applyActions,
      unApply: [{
        type: 'retain',
        offset: startIndex
      }, ...deletedData.map<Action>(item => {
        if (typeof item === 'string') {
          return {
            type: 'contentInsert',
            content: item,
            ref: item
          }
        }
        item.changeMarker.parentModel = null
        this.__changeMarker__.recordComponentRemoved(item)
        return {
          type: 'contentInsert',
          content: item.toJSON(),
          ref: item
        }
      }), ...Slot.createActionByFormat(deletedFormat)]
    })
    this.contentChangeEvent.next(applyActions)
    return true
  }

  /**
   * 给插槽应用新的格式，如果为块级样式，则应用到整个插槽，否则根据参数配置的范围应用
   * @param formatter
   * @param data
   */
  applyFormat<U extends FormatValue>(formatter: Formatter<U>, data: FormatRange<U>): void {
    this.retain(data.startIndex)
    this.retain(data.endIndex - data.startIndex, formatter, data.value)
  }

  /**
   * 在当前插槽内删除指定的组件
   * @param component
   */
  removeComponent(component: Component) {
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
    return this.cutTo(new Slot([...this.schema]), startIndex, endIndex)
  }

  /**
   * 把当前插槽内指定范围的内容剪切到新插槽
   * @param slot 新插槽
   * @param startIndex
   * @param endIndex
   */
  cutTo(slot: Slot, startIndex = 0, endIndex = this.length): Slot {
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
    if (slot.isEmpty) {
      this.attributes.forEach((value, key) => {
        slot.setAttribute(key, value)
      })
    }
    startIndex = this.content.correctIndex(startIndex, false)
    endIndex = this.content.correctIndex(endIndex, true)
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
    temporarySlot.toDelta().forEach(item => {
      slot.insert(item.insert, item.formats)
    })
    // if (this.isEmpty) {
    //   this.cleanAttributes()
    // }
    return slot
  }

  /**
   * 查找组件在插槽内的索引
   * @param component
   */
  indexOf(component: Component) {
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
   * 获取传入格式在插槽指定内范围的集合
   * @param formatter 指定的格式
   * @param startIndex
   * @param endIndex
   */
  getFormatRangesByFormatter<T extends Formatter<any>,
    U = T extends Formatter<infer V> ? V : never>(
    formatter: T,
    startIndex: number,
    endIndex: number): FormatRange<U>[] {
    return this.format.extractFormatRangesByFormatter(startIndex, endIndex, formatter)
  }

  /**
   * 获取插槽格式的数组集合
   */
  getFormats(): FormatItem[] {
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
  toJSON(): SlotLiteral {
    const attrs: Record<string, any> = {}
    this.attributes.forEach((value, key) => {
      attrs[key.name] = value
    })
    return new SlotJSON(
      [...this.schema],
      this.content.toJSON(),
      attrs,
      this.format.toJSON()
    )
  }

  toString() {
    return this.content.toString()
  }

  /**
   * 将插槽数据转换为 delta 表示
   */
  toDelta(): DeltaLite {
    const deltaList = new DeltaLite()
    if (this.length === 0) {
      return deltaList
    }
    const formatGrid = this.format.toGrid()
    const contentGrid = this.content.toGrid()

    const gridSet = new Set<number>([...formatGrid, ...contentGrid])

    const grid = [...gridSet].sort((a, b) => a - b)

    this.attributes.forEach((value, key) => {
      deltaList.attributes.set(key, value)
    })
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
    delta.attributes.forEach((value, key) => {
      this.setAttribute(key, value)
    })
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
  cleanFormats(excludeFormats: Formatter<any>[] | ((formatter: Formatter<any>) => boolean) = [], startIndex = 0, endIndex = this.length) {
    const formats = this.getFormats()
    if (formats.length) {
      formats.forEach(item => {
        if (typeof excludeFormats === 'function' ? excludeFormats(item.formatter) : excludeFormats.includes(item.formatter)) {
          return
        }
        this.retain(startIndex)
        this.retain(endIndex - startIndex, item.formatter, null)
      })
    } else {
      this.sliceContent(startIndex, endIndex).forEach(item => {
        if (typeof item !== 'string') {
          item.__slots__.forEach(slot => {
            slot.cleanFormats(excludeFormats)
          })
        }
      })
    }
  }

  /**
   * 当在回调函数中应用样式时，将把应用的样式作为子插槽的最低优化级合并
   * @param fn
   */
  background(fn: () => void) {
    this.applyFormatCoverChild = true
    fn()
    this.applyFormatCoverChild = false
  }

  /**
   * 清除插槽属性
   * @param excludeAttributes 要排除的属性
   */
  cleanAttributes(excludeAttributes: Attribute<any>[] | ((attribute: Attribute<any>) => boolean) = []) {
    Array.from(this.attributes.keys()).forEach(item => {
      if (typeof excludeAttributes === 'function' ? excludeAttributes(item) : excludeAttributes.includes(item)) {
        return
      }
      this.removeAttribute(item)
    })
    this.sliceContent().forEach(item => {
      if (typeof item !== 'string') {
        item.__slots__.forEach(slot => {
          slot.cleanAttributes(excludeAttributes)
        })
      }
    })
  }

  /**
   * 根据插槽的格式数据，生成格式树
   */
  toTree(slotRenderFactory: SlotRenderFactory, renderEnv?: any): VElement {
    const formatTree = this.format.toTree(0, this.length)
    let children = formatTree.children ?
      this.createVDomByFormatTree(this, formatTree.children, renderEnv) :
      this.createVDomByContent(this, formatTree.startIndex, formatTree.endIndex)

    if (formatTree.formats) {
      children = [this.createVDomByOverlapFormats(formatTree.formats, children, renderEnv)]
    }
    const root = slotRenderFactory(children)
    for (const [attribute, value] of this.getAttributes()) {
      attribute.render(root, value, renderEnv)
    }
    root.location = {
      slot: this,
      startIndex: 0,
      endIndex: this.length
    }
    return root
  }

  private applyFormats(formats: Formats, startIndex: number, offset: number, background: boolean) {
    formats.forEach(keyValue => {
      const key = keyValue[0]
      const value = keyValue[1]

      this.format.merge(key, {
        startIndex,
        endIndex: startIndex + offset,
        value
      }, background)
    })
  }

  private createVDomByFormatTree(
    slot: Slot,
    formats: FormatTree<any>[],
    renderEnv: any) {
    const nodes: Array<VElement | VTextNode | Component> = []
    for (const child of formats) {
      if (child.formats?.length) {
        const children = child.children ?
          this.createVDomByFormatTree(slot, child.children, renderEnv) :
          this.createVDomByContent(slot, child.startIndex, child.endIndex)

        const nextChildren = this.createVDomByOverlapFormats(
          child.formats,
          children,
          renderEnv
        )
        nodes.push(nextChildren)
      } else {
        nodes.push(...this.createVDomByContent(
          slot,
          child.startIndex,
          child.endIndex,
        ))
      }
    }
    return nodes
  }

  private createVDomByOverlapFormats(
    formats: (FormatItem<any>)[],
    children: Array<VElement | VTextNode | Component>,
    renderEnv: any
  ): VElement {
    const hostBindings: Array<{render: FormatHostBindingRender, item: FormatItem<any>}> = []
    let host: VElement | null = null
    for (let i = formats.length - 1; i > -1; i--) {
      const item = formats[i]
      const next = item.formatter.render(children, item.value, renderEnv)
      if (!next) {
        throw slotError(`Formatter \`${item.formatter.name}\` must return an VElement!`)
      }
      if (!(next instanceof VElement)) {
        hostBindings.push({
          item,
          render: next
        })
        continue
      }
      next.location = {
        slot: this,
        startIndex: item.startIndex,
        endIndex: item.endIndex
      }
      host = next
      children = [next]
    }
    for (const binding of hostBindings) {
      const { render, item } = binding
      if (!host) {
        host = new VElement(render.fallbackTagName)
        host.location = {
          slot: this,
          startIndex: item.startIndex,
          endIndex: item.endIndex
        }
        host.appendChild(...children)
      }
      render.attach(host)
    }
    return host!
  }

  private createVDomByContent(
    slot: Slot,
    startIndex: number,
    endIndex: number
  ): Array<VTextNode | VElement | Component> {
    const elements: Array<string | Component> = slot.sliceContent(startIndex, endIndex).map(i => {
      if (typeof i === 'string') {
        return i.match(/\n|[^\n]+/g)!
      }
      return i
    }).flat()
    return elements.map(item => {
      let vNode!: VElement | VTextNode | Component
      let length: number
      if (typeof item === 'string') {
        if (item === '\n') {
          vNode = new VElement('br')
          vNode.location = {
            slot: this,
            startIndex,
            endIndex: startIndex + 1
          }
          length = 1
        } else {
          vNode = new VTextNode(item)
          length = item.length
          vNode.location = {
            slot,
            startIndex,
            endIndex: startIndex + length
          }
        }
      } else {
        length = 1
        vNode = item
      }
      startIndex += length
      return vNode
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

export class SlotJSON implements SlotLiteral {
  constructor(public schema: ContentType[],
              public content: Array<string | ComponentLiteral>,
              public attributes: Record<string, any>,
              public formats: FormatLiteral) {
  }
}
