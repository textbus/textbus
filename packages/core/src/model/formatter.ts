import { VElement } from './element'
import { FormatValue } from './format'

export enum FormatType {
  Block = 0,
  Inline
}

export enum FormatPriority {
  Outer,
  Tag,
  Attribute
}

/**
 * Textbus 扩展格式要实现的接口
 */
export interface Formatter<T extends FormatType = any> {
  name: string
  type: T
  priority: FormatPriority
  columned?: boolean

  render(
    node: VElement | null,
    formatValue: FormatValue,
    isOutputMode: boolean
  ): VElement | void
}

export interface BlockFormatter extends Formatter<FormatType.Block> {
}

export interface InlineFormatter extends Formatter<FormatType.Inline> {
}
