import {
  Commander,
  Component,
  ComponentStateLiteral,
  ContentType,
  onDestroy,
  onFocusIn,
  onFocusOut,
  onGetRanges,
  Registry,
  Selection,
  Slot, SlotRange,
  Subject,
  Textbus,
  useContext,
} from '@textbus/core'
import { createSignal } from '@viewfly/core'
import { v4 } from 'uuid'

import { ParagraphComponent } from '../paragraph/paragraph.component'
import { TableSelection } from './components/selection-mask'
import { useBlockContent } from '../../hooks/use-block-content'
import { applyRectangles, findNonIntersectingRectangles, getMaxRectangle, Rectangle, RenderRow } from './tools/merge'

export interface Cell {
  id: string
  slot: Slot
}

export interface Row {
  height: number
  cells: Cell[]
}

export type TableComponentMergeCellConfig = Record<string, string>

export interface TableComponentState {
  columnsConfig: number[]
  rows: Row[]
  mergeConfig: TableComponentMergeCellConfig
}

const defaultRowHeight = 30
const defaultColumnWidth = 100

export class TableComponent extends Component<TableComponentState> {
  static componentName = 'TableComponent'
  static type = ContentType.BlockComponent

  static fromJSON(textbus: Textbus, json: ComponentStateLiteral<TableComponentState>) {
    const registry = textbus.get(Registry)
    return new TableComponent(textbus, {
      columnsConfig: json.columnsConfig || [],
      mergeConfig: json.mergeConfig || [],
      rows: json.rows.map<Row>(row => {
        return {
          height: row.height,
          cells: row.cells.map(cell => {
            return {
              id: cell.id,
              slot: registry.createSlot(cell.slot)
            }
          })
        }
      })
    })
  }

  private selection = this.textbus.get(Selection)
  private commander = this.textbus.get(Commander)

  constructor(textbus: Textbus, state: TableComponentState = {
    columnsConfig: Array.from<number>({ length: 5 }).fill(defaultColumnWidth),
    mergeConfig: {},
    rows: Array.from({ length: 3 }).map(() => {
      return {
        height: defaultRowHeight,
        cells: Array.from({ length: 5 }).map(() => {
          const p = new ParagraphComponent(textbus)
          const slot = new Slot([ContentType.BlockComponent])
          slot.insert(p)
          return {
            slot,
            id: v4()
          }
        })
      }
    })
  }) {
    super(textbus, state)
  }

  focus = new Subject<boolean>()
  tableSelection = createSignal<TableSelection | null>(null)

  ignoreSelectionChanges = false

  private normalizedData: RenderRow[] = []

  override getSlots(): Slot[] {
    return this.normalizedData.map(item => {
      return item.cells.filter(i => i.visible).map(i => i.raw.slot)
    }).flat()
  }

  mergeCellBySelection() {
    const slots = this.getSelectedNormalizedSlots()
    if (slots) {
      const start = slots.at(0)?.cells.at(0)?.raw
      const end = slots.at(-1)?.cells.at(-1)?.raw
      if (start && end) {
        slots.forEach(item => {
          item.cells.forEach(cell => {
            if (cell.raw.id === start.id) {
              return
            }
            cell.raw.slot.cleanFormats()
            cell.raw.slot.cleanAttributes()
            cell.raw.slot.retain(0)
            cell.raw.slot.delete(cell.raw.slot.length)

            Reflect.deleteProperty(this.state.mergeConfig, cell.raw.id)
          })
        })
        this.state.mergeConfig[start.id] = end.id
      }
    }
    this.selection.collapse(true)
  }

  splitCellsBySelection() {
    const slots = this.getSelectedNormalizedSlots()
    if (slots) {
      slots.forEach(item => {
        item.cells.forEach(cell => {
          Reflect.deleteProperty(this.state.mergeConfig, cell.raw.id)
        })
      })
      const start = slots.at(0)?.cells.at(0)?.raw
      const end = slots.at(-1)?.cells.at(-1)?.raw
      if (start && end) {
        this.selection.setBaseAndExtent(start.slot, 0, end.slot, end.slot.length)
      }
    }
  }

  getMaxRectangle(startSlot: Slot, endSlot: Slot): Rectangle | null {
    let index1 = -1
    let index2 = -1

    let x1 = -1
    let x2 = -1
    let y1 = -1
    let y2 = -1

    let index = 0
    for (let i = 0; i < this.state.rows.length; i++) {
      const row = this.state.rows[i]
      for (let j = 0; j < row.cells.length; j++) {
        const item = row.cells[j]
        if (item.slot === startSlot) {
          index1 = index
          x1 = j
          y1 = i
        }
        if (item.slot === endSlot) {
          index2 = index
          x2 = j
          y2 = i
        }
        index++
      }
    }
    if (index1 === -1 || index2 === -1) {
      return null
    }

    if (x1 > x2) {
      [x1, x2] = [x2, x1]
    }
    if (y1 > y2) {
      [y1, y2] = [y2, y1]
    }

    return getMaxRectangle(new Rectangle(x1, y1, x2 + 1, y2 + 1), this.getMergedRectangles())
  }

  getSelectedNormalizedSlots() {
    const rect = this.getSelectedRect()
    if (rect) {
      return this.getSelectedNormalizedSlotsByRectangle(rect)
    }
    return null
  }

  getSelectedRect() {
    const getSelfSlot = (slot: Slot): Slot | null => {
      let cell: Slot | null = slot
      while (cell?.parent && cell.parent !== this) {
        cell = cell.parentSlot
      }
      return cell
    }
    const start = getSelfSlot(this.selection.startSlot!)
    const end = getSelfSlot(this.selection.endSlot!)
    if (start && end) {
      return this.getMaxRectangle(start, end)
    }
    return null
  }

  getSelectedNormalizedSlotsByRectangle(rectangle: Rectangle) {
    return this.normalizedData.slice(rectangle.y1, rectangle.y2).map(item => {
      return {
        row: item.row,
        cells: item.cells.slice(rectangle.x1, rectangle.x2)
      }
    })
  }

  getCellBySlot(slot: Slot): Cell | null {
    for (const row of this.state.rows) {
      for (const cell of row.cells) {
        if (cell.slot === slot) {
          return cell
        }
      }
    }
    return null
  }

  getNormalizedData() {
    if (!this.changeMarker.dirty) {
      return this.normalizedData
    }

    const nonIntersectingRectangles = this.getMergedRectangles()
    this.normalizedData = applyRectangles(this.state.rows, nonIntersectingRectangles)
    return this.normalizedData
  }

  selectRow(startIndex: number, endIndex: number = startIndex + 1) {
    if (startIndex > endIndex) {
      [startIndex, endIndex] = [endIndex, startIndex]
    }
    if (startIndex === endIndex) {
      endIndex++
    }
    const selectedSlots: Slot[] = []
    const rows = this.getNormalizedData()
    rows.slice(startIndex, endIndex).forEach(row => {
      selectedSlots.push(...row.cells.filter(i => i.visible).map(i => i.raw.slot))
    })
    this.ignoreSelectionChanges = true
    const slotRanges = selectedSlots.map(i => {
      return {
        slot: i,
        startIndex: 0,
        endIndex: i.length
      }
    })
    this.selection.setSelectedRanges(slotRanges)

    this.tableSelection.set({
      startColumn: 0,
      endColumn: this.state.columnsConfig.length,
      startRow: startIndex,
      endRow: endIndex,
    })

    this.focus.next(true)

    if (slotRanges.length) {
      setTimeout(() => {
        this.selection.restore()
        this.textbus.focus()
      })
    }
  }

  selectColumn(startIndex: number, endIndex: number = startIndex + 1) {
    if (startIndex > endIndex) {
      [startIndex, endIndex] = [endIndex, startIndex]
    }
    if (startIndex === endIndex) {
      endIndex++
    }
    const selectedSlots: Slot[] = []
    const rows = this.getNormalizedData()
    rows.forEach(row => {
      selectedSlots.push(...row.cells.slice(startIndex, endIndex).filter(i => i.visible).map(i => i.raw.slot))
    })
    this.ignoreSelectionChanges = true
    const slotRanges = selectedSlots.map(i => {
      return {
        slot: i,
        startIndex: 0,
        endIndex: i.length
      }
    })
    this.selection.setSelectedRanges(slotRanges)

    this.tableSelection.set({
      startColumn: startIndex,
      endColumn: endIndex,
      startRow: 0,
      endRow: this.state.rows.length,
    })
    this.focus.next(true)
    this.selection.restore()
    this.textbus.focus()
    // if (slotRanges.length) {
    //   setTimeout(() => {
    //     this.selection.restore()
    //     this.textbus.focus()
    //   })
    // }
  }

  private getMergedRectangles() {
    const rectangles: Rectangle[] = []
    Object.entries(this.state.mergeConfig).forEach(([key, value]) => {
      const p1 = this.getCoordinateById(key)
      if (p1) {
        const p2 = this.getCoordinateById(value)
        if (p2) {
          rectangles.push(new Rectangle(p1[0], p1[1], p2[0] + 1, p2[1] + 1))
        }
      }
    })
    return findNonIntersectingRectangles(rectangles)
  }

  private getCoordinateById(id: string) {
    const rows = this.state.rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const colIndex = row.cells.findIndex(i => i.id === id)
      if (colIndex > -1) {
        return [colIndex, i]
      }
    }
    return null
  }

  override setup() {
    const selection = useContext(Selection)
    onFocusIn(() => {
      this.focus.next(true)
    })
    onFocusOut(() => {
      this.focus.next(false)
    })

    useBlockContent((slot) => {
      return slot.parent === this
    })

    const sub = selection.onChange.subscribe(() => {
      if (this.ignoreSelectionChanges) {
        return
      }
      if (selection.commonAncestorComponent !== this || selection.isCollapsed) {
        this.tableSelection.set(null)
      }
    })

    onDestroy(() => {
      sub.unsubscribe()
    })

    onGetRanges(ev => {
      if (this.selection.isCollapsed || this.ignoreSelectionChanges) {
        return
      }
      const rect = this.getSelectedRect()
      if (rect) {
        this.tableSelection.set({
          startColumn: rect.x1,
          endColumn: rect.x2,
          startRow: rect.y1,
          endRow: rect.y2
        })
        const selectedSlots = this.getSelectedNormalizedSlotsByRectangle(rect)
        const slotRanges = selectedSlots.map(item => {
          return item.cells.filter(i => {
            return i.visible
          }).map<SlotRange>(i => {
            return {
              startIndex: 0,
              endIndex: i.raw.slot.length,
              slot: i.raw.slot
            }
          })
        }).flat()
        if (slotRanges.length > 1) {
          ev.useRanges(slotRanges)
        }
      }
    })
  }

  deleteColumns() {
    const selection = this.tableSelection()
    if (selection) {
      const { startColumn, endColumn } = selection
      if (startColumn === 0 && endColumn === this.state.columnsConfig.length) {
        this.commander.removeComponent(this)
        return
      }
      this.state.columnsConfig.splice(startColumn, endColumn - startColumn)
      const mergeConfig = this.state.mergeConfig
      const keys = Object.keys(mergeConfig)

      this.state.rows.forEach(row => {
        const before = row.cells.at(startColumn - 1)
        const after = row.cells.at(endColumn)
        const cells = row.cells.splice(startColumn, endColumn - startColumn)

        cells.forEach(cell => {
          if (keys.includes(cell.id)) {
            if (after) {
              mergeConfig[after.id] = mergeConfig[cell.id]
            }
            Reflect.deleteProperty(mergeConfig, cell.id)
          }
          if (before) {
            keys.forEach(key => {
              if (mergeConfig[key] === cell.id) {
                mergeConfig[key] = before.id
              }
            })
          }
        })
      })
    }
    this.tableSelection.set(null)
    this.selection.unSelect()
  }

  deleteRows() {
    const selection = this.tableSelection()
    if (selection) {
      const { startRow, endRow } = selection
      if (startRow === 0 && endRow === this.state.rows.length) {
        this.commander.removeComponent(this)
        return
      }
      const mergeConfig = this.state.mergeConfig
      const keys = Object.keys(mergeConfig)

      const rows = this.state.rows
      const deletedRows = rows.splice(startRow, endRow - startRow)
      deletedRows.forEach(row => {
        row.cells.forEach((cell, colIndex) => {
          const before = rows.at(startRow - 1)?.cells.at(colIndex)
          const after = rows.at(startRow)?.cells.at(colIndex)

          if (keys.includes(cell.id)) {
            if (after) {
              mergeConfig[after.id] = mergeConfig[cell.id]
            }
            Reflect.deleteProperty(mergeConfig, cell.id)
          }
          if (before) {
            keys.forEach(key => {
              if (mergeConfig[key] === cell.id) {
                mergeConfig[key] = before.id
              }
            })
          }
        })
      })
    }
    this.tableSelection.set(null)
    this.selection.unSelect()
  }

  insertColumn(index: number) {
    this.state.columnsConfig.splice(index, 0, defaultColumnWidth)
    this.state.rows.forEach(row => {
      const slot = new Slot([
        ContentType.BlockComponent,
      ])
      slot.insert(new ParagraphComponent(this.textbus, {
        slot: new Slot([
          ContentType.InlineComponent,
          ContentType.Text
        ])
      }))
      row.cells.splice(index, 0, {
        id: v4(),
        slot
      })
    })
    this.textbus.nextTick(() => {
      const slot = this.state.rows[0].cells[index].slot
      if (slot) {
        this.selection.selectFirstPosition(slot.getContentAtIndex(0) as Component<any>)
      }
    })
  }

  insertRow(index: number) {
    this.state.rows.splice(index, 0, {
      height: defaultRowHeight,
      cells: this.state.columnsConfig.map(() => {
        const slot = new Slot([
          ContentType.BlockComponent,
        ])
        slot.insert(new ParagraphComponent(this.textbus, {
          slot: new Slot([
            ContentType.InlineComponent,
            ContentType.Text
          ])
        }))
        return {
          id: v4(),
          slot
        }
      })
    })
    this.textbus.nextTick(() => {
      const slot = this.state.rows[index].cells[0].slot
      if (slot) {
        this.selection.selectFirstPosition(slot.getContentAtIndex(0) as Component<any>)
      }
    })
  }
}
