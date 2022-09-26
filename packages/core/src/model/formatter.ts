import { VElement } from './element'
import { FormatValue } from './format'

/**
 * 格式类型
 */
export enum FormatType {
  Block = 0,
  Inline
}

/**
 * 格式渲染优先级
 */
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
