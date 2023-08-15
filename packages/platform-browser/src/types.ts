import { Slot } from '@textbus/core'
import { Observable } from '@tanbo/stream'

import { Rect } from './_utils/uikit'

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

export interface CompositionState {
  slot: Slot
  index: number
  data: string
}

export abstract class Input {
  /**
   * @experimental
   */
  abstract composition: boolean
  /**
   * @experimental
   */
  abstract compositionState: CompositionState | null
  abstract onReady: Promise<void>
  abstract caret: Caret
  abstract disabled: boolean

  abstract focus(nativeRange: Range, reFlash: boolean): void

  abstract blur(): void

  abstract destroy(): void
}
