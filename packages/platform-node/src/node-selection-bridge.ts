import { Injectable, NativeSelectionBridge, SelectionPosition } from '@textbus/core'

@Injectable()
export class NodeSelectionBridge implements NativeSelectionBridge {
  connect() {
    //
  }

  disConnect() {
    //
  }

  restore() {
    //
  }

  getNextLinePositionByCurrent(position: SelectionPosition): SelectionPosition | null {
    return position
  }

  getPreviousLinePositionByCurrent(position: SelectionPosition): SelectionPosition | null {
    return position
  }
}
