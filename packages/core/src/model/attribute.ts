import { VElement, VTextNode } from './element'
import { FormatValue } from './format'

export interface FormatHostBindingRender {
  fallbackTagName: string

  attach(host: VElement): void
}

/**
 * Textbus 扩展格式要实现的接口
 */
export abstract class Formatter<T extends FormatValue> {
  protected constructor(public name: string, public columned = false) {
  }

  abstract render(
    children: Array<VElement | VTextNode>,
    formatValue: T,
    isOutputMode: boolean): VElement | FormatHostBindingRender
}

export abstract class Attribute<T extends FormatValue> {
  protected constructor(public name: string) {
  }

  abstract render(
    node: VElement,
    formatValue: T,
    isOutputMode: boolean
  ): void
}
