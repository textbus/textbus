import { VElement } from './element'
import { FormatValue } from './format'

export enum FormatType {
  Block = 0,
  InlineTag = 100,
  Attribute = 200
}

export interface BlockFormatter {
  type: FormatType.Block
  name: string
  render(node: VElement | null, formatValue: FormatValue, isOutputMode: boolean): VElement | void
}

export interface InlineFormatter {
  type: FormatType.InlineTag
  name: string
  render(node: VElement | null, formatValue: FormatValue, isOutputMode: boolean): VElement | void
}

export interface AttributeFormatter {
  type: FormatType.Attribute
  name: string
  render(node: VElement | null, formatValue: FormatValue, isOutputMode: boolean): VElement | void
}

/**
 * Textbus 扩展格式要实现的接口
 */
export type Formatter = BlockFormatter | InlineFormatter | AttributeFormatter
