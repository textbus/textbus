import { Observable } from '@tanbo/stream'

export interface ViewController<T> {
  elementRef: HTMLElement
  onComplete: Observable<T>
  onCancel: Observable<void>

  reset(): void

  update(newValue: T): void
}
