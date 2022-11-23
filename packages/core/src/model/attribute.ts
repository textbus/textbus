import { VElement, VTextNode } from './element'
import { FormatValue } from './format'
import { RenderMode } from './types'

export interface FormatHostBindingRender {
  fallbackTagName: string

  attach(host: VElement): void
}

/**
 * Textbus 扩展格式要实现的接口
 */
export abstract class Formatter<T extends FormatValue> {
  protected constructor(public name: string, public columned?: boolean) {
  }

  abstract render(
    children: Array<VElement | VTextNode>,
    formatValue: T,
    renderMode: RenderMode): VElement | FormatHostBindingRender
}

export abstract class Attribute<T extends FormatValue> {
  protected constructor(public name: string) {
  }

  abstract render(
    node: VElement,
    formatValue: T,
    renderMode: RenderMode
  ): void
}
