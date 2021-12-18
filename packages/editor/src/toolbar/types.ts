import { Injector } from '@tanbo/di'

export interface Tool {
  setup(injector: Injector, limitElement: HTMLElement): HTMLElement

  refreshState(): void

  disabled(is: boolean): void

  onDestroy?(): void
}
