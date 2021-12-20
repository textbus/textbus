import { Subscription } from '@tanbo/stream'

import { ComponentInstance, ComponentLiteral } from './component'
import { Action } from './operation'
import { Content } from './content'
import { Format, FormatLiteral, FormatRange, FormatValue } from './format'
import { AttributeFormatter, BlockFormatter, Formatter, FormatType, InlineFormatter } from './formatter'
import { ChangeMarker } from './change-marker'

export enum ContentType {
  Text = 1,
  InlineComponent,
  BlockComponent
}

export type Formats = [formatter: Formatter, value: FormatValue][]

export interface SlotLiteral<T = any> {
  schema: ContentType[]
  content: Array<string | ComponentLiteral>
  formats: FormatLiteral
  state: T | null
}

export const placeholder = '\u200b'

export class Slot<T = any> {
  parent: ComponentInstance | null = null
  changeMarker = new ChangeMarker()

  private componentChangeListeners = new WeakMap<ComponentInstance, Subscription>()

  get length() {
    return this.content.length
  }

  get isEmpty() {
    return this.length === 1 && this.getContentAtIndex(0) === Slot.placeholder
  }

  get index() {
    return this.isEmpty ? 0 : this._index
  }

  readonly id = Math.random()

  protected _index = 0

  protected content = new Content()
  protected format = new Format(this)

  constructor(public schema: ContentType[], public state: T | null = null) {
    Object.freeze(state)
    this.content.append(Slot.placeholder)
  }

  setState(newState: T) {
    if (typeof newState === 'object') {
      Object.assign(newState as any)
    }
    const oldState = this.state
    this.state = newState
    this.changeMarker.markAsDirtied({
      path: [],
      apply: [{
        type: 'apply',
        state: newState
      }],
      unApply: [{
        type: 'apply',
        state: oldState
      }]
    })
    return true
  }

  write(content: string | ComponentInstance) {
    const isString = typeof content === 'string'
    const contentType = isString ? ContentType.Text : content.type
    if (!this.schema.includes(contentType)) {
      return false
    }
    if (isString) {
      const index = this.index
      const expandFormat = (this.isEmpty || index === 0) ? this.format.extract(0, 1) : this.format.extract(index - 1, index)

      const formats: Formats = expandFormat.toArray().map(i => {
        return [
          i.formatter,
          i.value
        ]
      })
      return this.insert(content, formats)
    }
    return this.insert(content)
  }

  insert(content: string | ComponentInstance): boolean
  insert(content: string, formats: Formats): boolean
  insert(content: string, formatter: Formatter, value: FormatValue): boolean
  insert(content: string | ComponentInstance, formatter?: Formatter | Formats, value?: FormatValue): boolean {
    const contentType = typeof content === 'string' ? ContentType.Text : content.type
    if (!this.schema.includes(contentType)) {
      return false
    }

    const prevContent = this.getContentAtIndex(this.index - 1)
    if (prevContent === placeholder) {
      this.delete(1)
    }

    const isEmpty = this.isEmpty
    let actionData: string | ComponentLiteral
    let length: number
    const startIndex = this.index
    let formats: Formats = []

    if (typeof content === 'string') {
      if (content.length === 0) {
        return true
      }
      if (formatter) {
        if (Array.isArray(formatter)) {
          formats = formatter
        } else {
          formats.push([formatter, value as FormatValue])
        }
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
      this.componentChangeListeners.set(content, sub)
    }
    this.format.split(startIndex, length)

    const endIndex = startIndex + length
    this.content.insert(startIndex, content)
    this.applyFormats(formats, startIndex, endIndex)

    if (isEmpty) {
      this.content.cut(this.length - 1)
    }

    this._index = startIndex + length
    this.changeMarker.markAsDirtied({
      path: [],
      apply: [{
        type: 'retain',
        index: startIndex
      }, formats.length ? {
        type: 'insert',
        content: actionData,
        formats: formats.reduce((opt: Record<string, any>, next) => {
          opt[next[0].name] = next[1]
          return opt
        }, {})
      } : {
        type: 'insert',
        content: actionData
      }],
      unApply: [{
        type: 'retain',
        index: endIndex
      }, {
        type: 'delete',
        count: length
      }]
    })
    return true
  }

  retain(index: number): boolean
  retain(index: number, formats: Formats): boolean
  retain(index: number, formatter: Formatter, value: FormatValue | null): boolean
  retain(index: number, formatter?: Formatter | Formats, value?: FormatValue | null): boolean {
    if (index < 0) {
      index = 0
    }
    const len = this.length
    if (index > len) {
      index = len
    }
    if (index === this._index) {
      return false
    }
    let formats: Formats = []
    const startIndex = this._index
    const endIndex = index
    this._index = index
    if (formatter) {
      if (Array.isArray(formatter)) {
        formats = formatter
      } else {
        formats.push([formatter, value as FormatValue])
      }
    }
    if (formats.length) {
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
        const offset = index + content.length
        if (typeof content === 'string' || content.type !== ContentType.BlockComponent) {
          const deletedFormat = this.format.extract(index, offset)
          this.applyFormats(formats, index, offset)
          applyActions.push({
            type: 'retain',
            index: index
          }, {
            type: 'retain',
            index: offset,
            formats: {
              ...formatsObj
            }
          })
          unApplyActions.push({
            type: 'retain',
            index: index
          }, {
            type: 'retain',
            index: offset,
            formats: resetFormatObj
          }, ...Slot.createActionByFormat(deletedFormat))
        } else {
          content.slots.toArray().forEach(slot => {
            slot.retain(0)
            slot.retain(slot.length, formats)
          })
        }
        index = offset
      })
      if (applyActions.length || unApplyActions.length) {
        this.changeMarker.markAsDirtied({
          path: [],
          apply: applyActions,
          unApply: unApplyActions
        })
      }
    }
    return true
  }

  delete(count: number): boolean {
    if (count > this._index) {
      count = this._index
    }
    if (count <= 0) {
      return false
    }
    const startIndex = this._index - count
    const endIndex = this._index
    const deletedData = this.content.cut(startIndex, endIndex)
    const deletedFormat = this.format.extract(startIndex, endIndex)

    this.format.shrink(endIndex, count)

    if (this.length === 0) {
      this.content.append(Slot.placeholder)
      this.format = deletedFormat.extract(0, 1)
    }

    this._index = startIndex
    this.changeMarker.markAsDirtied({
      path: [],
      apply: [{
        type: 'retain',
        index: endIndex
      }, {
        type: 'delete',
        count
      }],
      unApply: [{
        type: 'retain',
        index: startIndex
      }, ...deletedData.map<Action>(item => {
        if (typeof item === 'string') {
          return {
            type: 'insert',
            content: item
          }
        }
        this.changeMarker.recordComponentRemoved(item)
        this.componentChangeListeners.get(item)?.unsubscribe()
        this.componentChangeListeners.delete(item)
        item.parent = null
        return {
          type: 'insert',
          content: item.toJSON()
        }
      }), ...Slot.createActionByFormat(deletedFormat)]
    })
    return true
  }

  applyFormat(formatter: BlockFormatter, data: FormatValue): void
  applyFormat(formatter: InlineFormatter | AttributeFormatter, data: FormatRange): void
  applyFormat(formatter: Formatter, data: FormatValue | FormatRange): void {
    if (formatter.type === FormatType.Block) {
      this.format.merge(formatter, data as FormatValue)
    } else {
      this.retain((data as FormatRange).startIndex)
      this.retain((data as FormatRange).endIndex, formatter, (data as FormatRange).value)
    }
  }

  removeComponent(component: ComponentInstance) {
    const index = this.indexOf(component)
    if (index > -1) {
      this.retain(index + 1)
      return this.delete(1)
    }
    return false
  }

  cut(startIndex = 0, endIndex = this.length): Slot {
    return this.cutTo(new Slot(this.schema, this.state), startIndex, endIndex)
  }

  cutTo<T extends Slot>(slot: T, startIndex = 0, endIndex = this.length): T {
    if (startIndex < 0) {
      startIndex = 0
    }
    const length = this.length
    if (endIndex > length) {
      endIndex = length
    }
    if (this.isEmpty) {
      slot.format = this.format.createFormatByRange(slot, 0, 1)
      return slot
    }
    if (startIndex === length || startIndex === length - 1 && this.content.getContentAtIndex(length - 1) === '\n') {
      slot.format = this.format.createFormatByRange(slot, startIndex - 1, startIndex)
      return slot
    }
    if (startIndex >= endIndex) {
      return slot
    }

    const deletedData = this.content.slice(startIndex, endIndex)
    const deletedFormat = this.format.extract(startIndex, endIndex).shrink(startIndex, startIndex)

    deletedData.forEach(i => {
      slot.insert(i)
    })
    slot.format = deletedFormat
    this.retain(endIndex)
    this.delete(endIndex - startIndex)

    return slot
  }

  indexOf(component: ComponentInstance) {
    return this.content.indexOf(component)
  }

  getContentAtIndex(index: number) {
    return this.content.getContentAtIndex(index)
  }

  sliceContent(startIndex = 0, endIndex = this.length) {
    return this.content.slice(startIndex, endIndex)
  }

  createFormatTree() {
    return this.format.toTree(0, this.length)
  }

  getFormatRangesByFormatter(formatter: Formatter, startIndex: number, endIndex: number) {
    return this.format.extractFormatRangesByFormatter(startIndex, endIndex, formatter)
  }

  getFormats() {
    return this.format.toArray()
  }

  toJSON(): SlotLiteral<T> {
    return {
      schema: this.schema,
      content: this.content.toJSON(),
      formats: this.format.toJSON(),
      state: this.state
    }
  }

  private applyFormats(formats: Formats, startIndex: number, endIndex: number) {
    formats.forEach(keyValue => {
      const key = keyValue[0]
      const value = keyValue[1]

      if (key.type === FormatType.Block) {
        this.format.merge(key, value)
      } else {
        this.format.merge(key, {
          startIndex,
          endIndex,
          value
        })
      }
    })
  }

  private static createActionByFormat(format: Format) {
    return format.toArray().map<Action[]>(item => {
      return [{
        type: 'retain',
        index: item.startIndex
      }, {
        type: 'retain',
        index: item.endIndex,
        formats: {
          [item.formatter.name]: item.value
        }
      }]
    }).flat()
  }

  private static get placeholder() {
    // return this.schema.includes(ContentType.BlockComponent) ? '\n' : '\u200b'
    return '\n'
  }
}
