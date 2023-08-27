import { ViewAdapter } from '@textbus/core'
import { Subject } from '@tanbo/stream'

export class NodeViewAdapter extends ViewAdapter {
  onViewUpdated = new Subject<void>()

  copy() {
    //
  }

  render() {
    //
  }
}
