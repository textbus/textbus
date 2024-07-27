import { createSignal, inject } from '@viewfly/core'
import { Controller } from '@textbus/core'

export function useReadonly() {
  const controller = inject(Controller)
  const is = createSignal(controller.readonly)
  controller.onReadonlyStateChange.subscribe(() => {
    is.set(controller.readonly)
  })
  return is
}
