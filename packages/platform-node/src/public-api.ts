import { Module, NativeRenderer, NativeSelectionBridge } from '@textbus/core'

import { NodeSelectionBridge } from './node-selection-bridge'
import { NodeRenderer } from './node-renderer'

export {
  NodeRenderer,
  NodeSelectionBridge
}

export const nodeModule: Module = {
  providers: [
    {
      provide: NativeRenderer,
      useClass: NodeRenderer
    },
    {
      provide: NativeSelectionBridge,
      useClass: NodeSelectionBridge
    }
  ]
}
