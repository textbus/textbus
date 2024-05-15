import { Module, NativeSelectionBridge, Renderer } from '@textbus/core'
import { Provider } from '@viewfly/core'

import { NodeSelectionBridge } from './node-selection-bridge'
import { NodeViewAdapter } from './node-view-adapter'

export class NodeModule implements Module {
  providers: Provider[] = [{
    provide: NativeSelectionBridge,
    useValue: new NodeSelectionBridge()
  }, {
    provide: Renderer,
    useValue: new NodeViewAdapter()
  }]
}
