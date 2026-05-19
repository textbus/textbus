import { Observable } from '@tanbo/stream'

import { Rect } from './_utils/uikit'

export interface CaretLimit {
  top: number
  bottom: number
}

export interface CaretPosition {
  left: number
  top: number
  height: number
}

export function caretPositionEqual(a: CaretPosition | null, b: CaretPosition | null): boolean {
  if (a === b) {
    return true
  }
  if (a === null || b === null) {
    return false
  }
  return a.left === b.left && a.top === b.top && a.height === b.height
}

export interface Caret {
  onPositionChange: Observable<CaretPosition | null>
  readonly rect: Rect

  refresh(): void
}

export abstract class Input {
  /**
   * @experimental
   */
  abstract composition: boolean
  /**
   * @experimental
   */
  abstract onReady: Promise<void>
  abstract caret: Caret
  abstract disabled: boolean

  abstract focus(nativeRange: Range, reFlash: boolean): void

  abstract blur(): void

  abstract destroy(): void
}
