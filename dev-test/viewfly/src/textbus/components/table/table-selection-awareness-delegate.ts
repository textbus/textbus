import { Injectable } from '@viewfly/core'
import { CollaborateSelectionAwarenessDelegate, DomAdapter } from '@textbus/platform-browser'
import { AbstractSelection, Slot, Selection } from '@textbus/core'

import { TableComponent } from './table.component'

export function findFocusCell(table: TableComponent, slot: Slot): Slot | null {
  while (slot) {
    if (table.slots.includes(slot)) {
      return slot
    }
    slot = slot.parent?.parent as Slot
  }
  return null
}


@Injectable()
export class TableSelectionAwarenessDelegate extends CollaborateSelectionAwarenessDelegate {
  constructor(private domAdapter: DomAdapter,
              private selection: Selection) {
    super()
  }

  override getRects(abstractSelection: AbstractSelection) {
    const { focusSlot, anchorSlot } = abstractSelection
    const focusPaths = this.selection.getPathsBySlot(focusSlot)!
    const anchorPaths = this.selection.getPathsBySlot(anchorSlot)!
    const focusIsStart = Selection.compareSelectionPaths(focusPaths, anchorPaths)
    let startSlot: Slot
    let endSlot: Slot
    if (focusIsStart) {
      startSlot = focusSlot
      endSlot = anchorSlot
    } else {
      startSlot = anchorSlot
      endSlot = focusSlot
    }
    const commonAncestorComponent = Selection.getCommonAncestorComponent(startSlot, endSlot)
    if (!(commonAncestorComponent instanceof TableComponent)) {
      return false
    }

    const range = getSelectedRanges(commonAncestorComponent,
      findFocusCell(commonAncestorComponent, startSlot!)!,
      findFocusCell(commonAncestorComponent, endSlot!)!
    )
    const rows = commonAncestorComponent.state.rows

    const startFocusSlot = rows[range.startRow].cells[range.startColumn].slot
    const endFocusSlot = rows[range.endRow].cells[range.endColumn].slot

    const renderer = this.domAdapter
    const startRect = (renderer.getNativeNodeBySlot(startFocusSlot) as HTMLElement).getBoundingClientRect()
    const endRect = (renderer.getNativeNodeBySlot(endFocusSlot) as HTMLElement).getBoundingClientRect()

    return [{
      left: startRect.left,
      top: startRect.top,
      width: endRect.left + endRect.width - startRect.left,
      height: endRect.top + endRect.height - startRect.top
    }]
  }
}

function getSelectedRanges(component: TableComponent, startSlot: Slot, endSlot: Slot) {
  const p1 = finedPosition(component, startSlot)!
  const p2 = finedPosition(component, endSlot)!

  return {
    startRow: Math.min(p1.rowIndex, p2.rowIndex),
    endRow: Math.max(p1.rowIndex, p2.rowIndex),
    startColumn: Math.min(p1.columnIndex, p2.columnIndex),
    endColumn: Math.max(p1.columnIndex, p2.columnIndex)
  }
}

function finedPosition(component: TableComponent, slot: Slot) {
  const rows = component.state.rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    for (let j = 0; j < row.cells.length; j++) {
      const cell = row.cells[j].slot
      if (cell === slot) {
        return {
          rowIndex: i,
          columnIndex: j
        }
      }
    }
  }
  return null
}

