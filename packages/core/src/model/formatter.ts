import { VElement, VTextNode } from './element'
import { FormatValue } from './format'

/**
 * 格式类型
 */
export enum FormatType {
  Block = 0,
  Inline
}

export interface FormatHostBindingRender {
  fallbackTagName: string

  attach(host: VElement): void
}

/**
 * Textbus 扩展格式要实现的接口
 */
export interface Formatter<T extends FormatType = any> {
  name: string
  type: T
  columned?: boolean

  render(
    children: Array<VElement | VTextNode>,
    formatValue: FormatValue,
    isOutputMode: boolean): VElement | FormatHostBindingRender
}

export interface BlockFormatter extends Formatter<FormatType.Block> {
}

export interface InlineFormatter extends Formatter<FormatType.Inline> {
}
