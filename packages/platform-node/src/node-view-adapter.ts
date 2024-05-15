import { Renderer } from '@textbus/core'
import { Subject } from '@tanbo/stream'

export class NodeViewAdapter extends Renderer {
  onViewUpdated = new Subject<void>()

  copy() {
    //
  }

  render() {
    //
  }
}
