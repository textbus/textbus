import { ComponentLiteral, Module, TextbusConfig } from '@textbus/core'
import { Observable } from '@tanbo/stream'

import { FormatLoader, ComponentLoader, AttributeLoader } from '../dom-support/parser'
import { Rect } from '../_utils/uikit'

export interface ViewModule extends Module {
  componentLoaders?: ComponentLoader[]
  formatLoaders?: FormatLoader<any>[]
  attributeLoaders?: AttributeLoader<any>[]
}

/**
 * Textbus PC 端配置接口
 */
export interface ViewOptions extends TextbusConfig {
  imports?: ViewModule[]
  /** 自动获取焦点 */
  autoFocus?: boolean
  /** 编辑区最小高度 */
  minHeight?: string
  /** 组件加载器 */
  componentLoaders?: ComponentLoader[]
  /** 格式加载器 */
  formatLoaders?: FormatLoader<any>[]
  /** 属性加载器 */
  attributeLoaders?: AttributeLoader<any>[]
  /** 默认内容 */
  content?: string | ComponentLiteral
  /** 文档默认样式表 */
  styleSheets?: string[]
  /** 配置文档编辑状态下用到的样式 */
  editingStyleSheets?: string[]
  /** 使用 contentEditable 作为编辑器控制可编辑范围 */
  useContentEditable?: boolean
}

export interface CaretLimit {
  top: number
  bottom: number
}

export interface Scroller {
  onScroll: Observable<any>

  getLimit(): CaretLimit

  setOffset(offsetScrollTop: number): void
}

export interface CaretPosition {
  left: number
  top: number
  height: number
}

export interface Caret {
  onPositionChange: Observable<CaretPosition | null>
  readonly rect: Rect

  refresh(isFixedCaret: boolean): void

  correctScrollTop(scroller: Scroller): void
}

export abstract class Input {
  abstract composition: boolean
  abstract onReady: Promise<void>
  abstract caret: Caret
  abstract disabled: boolean

  abstract focus(nativeRange: Range, reFlash: boolean): void

  abstract blur(): void

  abstract destroy(): void
}
