import { Injectable } from '@viewfly/core'
import { CollaborateSelectionAwarenessDelegate, DomAdapter, UserSelectionCursor } from '@textbus/platform-browser'
import { AbstractSelection, Slot, Selection } from '@textbus/core'

import { TableComponent } from './table.component'
import { Rectangle } from './tools/merge'

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

  get(): Rectangle | null {
    if (this.selection.isCollapsed) {
      return null
    }
    const commonAncestorComponent = this.selection.commonAncestorComponent
    if (commonAncestorComponent instanceof TableComponent) {
      return commonAncestorComponent.getSelectedRect()
    }
    return null
  }

  override getRects(abstractSelection: AbstractSelection, _, data: UserSelectionCursor) {
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

    const rect = data.data || commonAncestorComponent.getMaxRectangle(
      findFocusCell(commonAncestorComponent, startSlot!)!,
      findFocusCell(commonAncestorComponent, endSlot!)!)
    const renderer = this.domAdapter

    if (!rect) {
      return false
    }
    const normalizedSlots = commonAncestorComponent.getSelectedNormalizedSlotsByRectangle(rect)
    const rects = normalizedSlots.map(row => {
      return row.cells.filter(i => i.visible).map(i => {
        const td = renderer.getNativeNodeBySlot(i.raw.slot) as HTMLElement
        return td.getBoundingClientRect()
      })
    }).flat()


    const left = Math.min(...rects.map(i => i.left))
    const top = Math.min(...rects.map(i => i.top))
    return [{
      left,
      top,
      width: Math.max(...rects.map(i => i.right)) - left,
      height: Math.max(...rects.map(i => i.bottom)) - top
    }]
  }
}


