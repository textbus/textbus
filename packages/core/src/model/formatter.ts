import { VElement } from './element'
import { FormatValue } from './format'

export enum FormatType {
  Block = 0,
  InlineTag = 100,
  Attribute = 200
}

/**
 * Textbus 扩展格式要实现的接口
 */
export interface Formatter<T extends FormatType = any> {
  type: T
  name: string
  columnAlignment?: boolean

  render(node: VElement | null, formatValue: FormatValue, isOutputMode: boolean): VElement | void
}

export interface BlockFormatter extends Formatter<FormatType.Block> {
}

export interface InlineFormatter extends Formatter<FormatType.InlineTag> {
}

export interface AttributeFormatter extends Formatter<FormatType.Attribute> {
}
