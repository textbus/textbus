import { createSignal, inject } from '@viewfly/core'

import { OutputInjectionToken } from '../injection-tokens'

export function useOutput() {
  return createSignal(inject(OutputInjectionToken))
}
