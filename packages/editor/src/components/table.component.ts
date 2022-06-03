import { Injectable, Injector } from '@tanbo/di'
import { ComponentLoader, SlotParser } from '@textbus/browser'
import {
  Commander,
  ComponentData,
  ComponentInstance,
  ContentType,
  defineComponent,
  onContextMenu,
  onSlotRemove,
  Selection,
  Slot,
  Range,
  SlotRender,
  useContext,
  useSelf,
  useSlots,
  useState,
  Renderer,
  jsx
} from '@textbus/core'

import { I18n } from '../i18n'
import {
  autoComplete, createCell, findFocusCell, selectCells,
  serialize,
  slotsToTable,
  TableCellPosition,
  TableCellSlot,
  TableConfig,
  useTableMultipleRange
} from './hooks/table-multiple-range'
import { CollaborateCursorAwarenessDelegate } from '@textbus/collaborate'

export {
  createCell
}

@Injectable()
export class TableComponentCursorAwarenessDelegate extends CollaborateCursorAwarenessDelegate {
  constructor(private renderer: Renderer,
              private selection: Selection) {
    super()
  }

  override getRects(range: Range) {
    const {focusSlot, anchorSlot} = range
    const focusPaths = this.selection.getPathsBySlot(focusSlot)
    const anchorPaths = this.selection.getPathsBySlot(anchorSlot)
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
    if (commonAncestorComponent?.name !== tableComponent.name) {
      return false
    }

    const startFocusSlot = findFocusCell(commonAncestorComponent, startSlot!)
    const endFocusSlot = findFocusCell(commonAncestorComponent, endSlot!)

    const state = commonAncestorComponent.state as TableConfig

    const {
      startPosition,
      endPosition
    } = selectCells(startFocusSlot as TableCellSlot, endFocusSlot as TableCellSlot, commonAncestorComponent, state.columnCount)

    const renderer = this.renderer
    const startRect = (renderer.getNativeNodeByVNode(renderer.getVNodeBySlot(startPosition.cell!)!) as HTMLElement).getBoundingClientRect()
    const endRect = (renderer.getNativeNodeByVNode(renderer.getVNodeBySlot(endPosition.cell!)!) as HTMLElement).getBoundingClientRect()

    return [{
      x: startRect.left,
      y: startRect.top,
      width: endRect.right - startRect.left,
      height: endRect.bottom - startRect.top
    }]
  }
}

export const tableComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'TableComponent',
  setup(data: ComponentData<TableConfig> = {
    slots: Array.from({length: 9}).fill(null).map(() => createCell()),
    state: {
      columnCount: 3,
      rowCount: 3,
      useTextbusStyle: false
    }
  }) {
    let tableCells = slotsToTable(data.slots! as TableCellSlot[], data.state!.columnCount)
    const injector = useContext()
    const i18n = injector.get(I18n)
    const selection = injector.get(Selection)
    const commander = injector.get(Commander)

    let tableInfo: TableConfig = {
      columnCount: tableCells[0].map(i => i.state!.colspan).reduce((v, n) => v + n, 0),
      useTextbusStyle: data.state?.useTextbusStyle || false,
      rowCount: tableCells.length
    }

    const stateController = useState(tableInfo)

    stateController.onChange.subscribe(s => {
      tableInfo = s
    })

    const self = useSelf()
    const slots = useSlots(tableCells.flat())

    let startPosition: TableCellPosition
    let endPosition: TableCellPosition
    useTableMultipleRange(slots, stateController, tableInfo, tableRange => {
      startPosition = tableRange.startPosition
      endPosition = tableRange.endPosition
    })

    onSlotRemove(ev => {
      ev.preventDefault()
    })

    onContextMenu(() => {
      return [{
        iconClasses: ['textbus-icon-table'],
        label: i18n.get('components.tableComponent.contextMenuLabel'),
        submenu: [{
          iconClasses: ['textbus-icon-table-add-column-left'],
          label: i18n.get('components.tableComponent.addColumnToLeft'),
          onClick() {
            instance.addColumnToLeft()
          }
        }, {
          iconClasses: ['textbus-icon-table-add-column-right'],
          label: i18n.get('components.tableComponent.addColumnToRight'),
          onClick() {
            instance.addColumnToRight()
          }
        }, {
          iconClasses: ['textbus-icon-table-add-row-top'],
          label: i18n.get('components.tableComponent.insertRowBefore'),
          onClick() {
            instance.addRowToTop()
          }
        }, {
          iconClasses: ['textbus-icon-table-add-row-bottom'],
          label: i18n.get('components.tableComponent.insertRowAfter'),
          onClick() {
            instance.addRowToBottom()
          }
        }, {
          iconClasses: ['textbus-icon-table-delete-column-left'],
          label: i18n.get('components.tableComponent.deleteColumns'),
          onClick() {
            instance.deleteColumns()
          }
        }, {
          iconClasses: ['textbus-icon-table-delete-row-top'],
          label: i18n.get('components.tableComponent.deleteRows'),
          onClick() {
            instance.deleteRows()
          }
        }, {
          iconClasses: ['textbus-icon-table-split-columns'],
          label: i18n.get('components.tableComponent.mergeCells'),
          onClick() {
            instance.mergeCells()
          }
        }, {
          iconClasses: ['textbus-icon-table'],
          label: i18n.get('components.tableComponent.splitCells'),
          onClick() {
            instance.splitCells()
          }
        }]
      }, {
        iconClasses: ['textbus-icon-table-remove'],
        label: i18n.get('components.tableComponent.contextMenuRemoveTable'),
        onClick() {
          commander.remove(self)
        }
      }]
    })

    const instance = {
      mergeCells() {
        if (!startPosition || !endPosition) {
          return
        }
        const serializedCells = serialize(tableCells)
        const minRow = startPosition.rowIndex
        const minColumn = startPosition.columnIndex
        const maxRow = endPosition.rowIndex + 1
        const maxColumn = endPosition.columnIndex + 1

        const selectedCells = serializedCells.slice(minRow, maxRow)
          .map(row => row.cellsPosition.slice(minColumn, maxColumn).filter(c => {
            return c.offsetRow === 0 && c.offsetColumn === 0
          }))
          .reduce((p, n) => {
            return p.concat(n)
          })
        const newNode = selectedCells.shift()
        newNode!.cell.updateState(draft => {
          draft.rowspan = maxRow - minRow
          draft.colspan = maxColumn - minColumn
        })

        selectedCells.forEach(cell => {
          slots.remove(cell.cell)
        })

        if (selection.startSlot !== newNode!.cell) {
          selection.setAnchor(newNode!.cell, 0)
        }
        if (selection.endSlot !== newNode!.cell) {
          selection.setFocus(newNode!.cell, newNode!.cell.length)
        }
      },
      splitCells() {
        if (!startPosition || !endPosition) {
          return
        }
        const serializedCells = serialize(tableCells)
        const minRow = startPosition.rowIndex
        const minColumn = startPosition.columnIndex
        const maxRow = endPosition.rowIndex + 1
        const maxColumn = endPosition.columnIndex + 1


        const table = serializedCells.map((tr, i) => {
          if (i < minRow || i >= maxRow) {
            return tr.cellsPosition.map(i => i.cell)
          }
          return tr.cellsPosition.map((td, index) => {
            if (index < minColumn || index >= maxColumn) {
              return td.cell
            }
            if (td.offsetRow === 0 && td.offsetColumn === 0) {
              const state = td.cell.state!
              if (state.rowspan > 1 || state.colspan > 1) {
                td.cell.updateState(draft => {
                  draft.rowspan = 1
                  draft.colspan = 1
                })
              }
              return td.cell
            }
            return createCell()
          })
        })

        const cells = Array.from(new Set(table.flat()))

        cells.forEach((newCell, index) => {
          const cell = slots.get(index)

          if (cell === newCell) {
            return
          }
          slots.insertByIndex(newCell, index)
        })
      },
      deleteColumns() {
        if (!startPosition || !endPosition) {
          return
        }
        const serializedCells = serialize(tableCells)
        const startIndex = startPosition.columnIndex
        const endIndex = endPosition.columnIndex

        stateController.update(draft => {
          draft.columnCount = tableInfo.columnCount - (endIndex - startIndex + 1)
        })

        serializedCells.forEach(tr => {
          for (let i = startIndex; i <= endIndex; i++) {
            const td = tr.cellsPosition[i]
            const startColumnIndex = td.columnIndex - td.offsetColumn
            if (startColumnIndex < startIndex) {
              if (startColumnIndex + td.cell.state!.colspan > endIndex) {
                td.cell.updateState(draft => {
                  draft.colspan = td.cell.state!.colspan - (endIndex - startIndex + 1)
                })
              } else {
                td.cell.updateState(draft => {
                  draft.colspan = startIndex - td.columnIndex
                })
              }
            } else if (startColumnIndex + td.cell.state!.colspan - 1 > endIndex) {
              td.cell.updateState(draft => {
                draft.colspan = td.cell.state!.colspan - (endIndex - startIndex + 1)
              })
              td.cell.cut()
            } else {
              const index = td.row.indexOf(td.cell)
              if (index > -1) {
                td.row.splice(index, 1)
              }
              slots.remove(td.cell)
            }
          }
        })
        if (slots.length === 0) {
          self.parent?.removeComponent(self)
        }
      },
      deleteRows() {
        if (!startPosition || !endPosition) {
          return
        }
        const serializedCells = serialize(tableCells)
        const startIndex = startPosition.rowIndex
        const endIndex = endPosition.rowIndex

        stateController.update(draft => {
          draft.rowCount = tableInfo.rowCount - (endIndex - startIndex + 1)
        })

        for (let i = startIndex; i <= endIndex; i++) {
          const tr = serializedCells[i]
          tr.cellsPosition.forEach(td => {
            const startRowIndex = td.rowIndex - td.offsetRow
            if (startRowIndex < startIndex) {
              if (startRowIndex + td.cell.state!.rowspan > endIndex) {
                td.cell.updateState(draft => {
                  draft.rowspan = td.cell.state!.rowspan - (endIndex - startIndex + 1)
                })
              } else {
                td.cell.updateState(draft => {
                  draft.rowspan = startIndex - td.rowIndex
                })
              }
            } else if (startRowIndex + td.cell.state!.rowspan - 1 > endIndex) {
              td.cell.updateState(draft => {
                draft.rowspan = td.cell.state!.rowspan - (endIndex - startIndex + 1)
              })
              td.cell.cut()
              const nextTr = serializedCells[i + 1]
              const afterTd = nextTr.cellsPosition.find(td2 => td2.cell === td.cell)!
              afterTd.row.splice(afterTd.row.indexOf(afterTd.cell), 0, td.cell)
            } else {
              slots.remove(td.cell)
            }
          })

          // tableCells.splice(startIndex, 1)
        }
        if (slots.length === 0) {
          self.parent?.removeComponent(self)
        }
      },
      addRowToBottom() {
        if (!startPosition || !endPosition) {
          return
        }
        this.insertRow(endPosition.rowIndex + 1)
      },
      addRowToTop() {
        if (!startPosition || !endPosition) {
          return
        }
        this.insertRow(startPosition.rowIndex)
      },
      addColumnToRight() {
        if (!startPosition || !endPosition) {
          return
        }
        this.insertColumn(endPosition.columnIndex + 1)
      },
      addColumnToLeft() {
        if (!startPosition || !endPosition) {
          return
        }
        this.insertColumn(startPosition.columnIndex)
      },
      insertRow(index: number) {
        const serializedCells = serialize(tableCells)
        const tr: Slot[] = []
        if (index === 0 || index === serializedCells.length) {
          for (let i = 0; i < tableInfo.columnCount; i++) {
            tr.push(createCell())
          }
          if (index === 0) {
            slots.insertByIndex(tr, 0)
          } else {
            slots.insertByIndex(tr, slots.length)
          }
          return
        }

        const row = serializedCells[index]

        stateController.update(draft => {
          draft.rowCount = tableInfo.rowCount + 1
        })

        row.cellsPosition.forEach(cell => {
          if (cell.offsetRow < cell.cell.state!.rowspan - 1) {
            if (cell.offsetColumn === 0) {
              cell.cell.updateState(draft => {
                draft.rowspan = cell.cell.state!.rowspan + 1
              })
            }
          } else {
            tr.push(createCell())
          }
        })
        tableCells.splice(tableCells.indexOf(row.cells), 0, tr)

        const result = Array.from(new Set(tableCells.flat()))

        result.forEach((newCell, index) => {
          const cell = slots.get(index)

          if (cell === newCell) {
            return
          }
          slots.insertByIndex(newCell, index)
        })
      },
      insertColumn(index: number) {
        if (index < 0) {
          index = 0
        }
        if (index > tableInfo.columnCount) {
          index = tableInfo.columnCount
        }
        const serializedCells = serialize(tableCells)

        const table: Slot[][] = serializedCells.map(tr => {
          return tr.cellsPosition.map(td => {
            return td.cell
          })
        })

        const recordCells: Slot[] = []
        serializedCells.forEach((row, rowIndex) => {
          if (index === 0) {
            table[rowIndex].unshift(createCell())
          } else if (index === tableInfo.columnCount) {
            table[rowIndex].push(createCell())
          } else {
            const cell = row.cellsPosition[index]
            if (cell.offsetColumn > 0) {
              if (recordCells.includes(cell.cell)) {
                return
              }
              cell.cell.updateState(draft => {
                draft.colspan = cell.cell.state!.colspan + 1
              })
              recordCells.push(cell.cell)
            } else {
              table[rowIndex].splice(index, 0, createCell())
            }
          }
        })

        const cells = table.flat()
        const result = Array.from(new Set(cells))

        result.forEach((newCell, index) => {
          const cell = slots.get(index)

          if (cell === newCell) {
            return
          }
          slots.insertByIndex(newCell, index)
        })

        stateController.update(draft => {
          draft.columnCount = tableInfo.columnCount + 1
        })
      },
      render(isOutputMode: boolean, slotRender: SlotRender) {
        tableCells = slotsToTable(slots.toArray(), tableInfo.columnCount)
        const table = jsx('table', {
          class: 'tb-table'
        })
        if (data.state!.useTextbusStyle) {
          table.classes.add('tb-table-textbus')
        }
        if (tableCells.length) {
          const body = jsx('tbody')
          table.appendChild(body)
          for (const row of tableCells) {
            const tr = jsx('tr')
            body.appendChild(tr)
            for (const col of row) {
              tr.appendChild(slotRender(col, () => {
                const td = jsx('td')
                if (col.state!.colspan > 1) {
                  td.attrs.set('colspan', col.state?.colspan)
                }
                if (col.state!.rowspan > 1) {
                  td.attrs.set('rowspan', col.state?.rowspan)
                }
                return td
              }))
            }
          }
        }
        return table
      }
    }
    return instance
  }
})

export const tableComponentLoader: ComponentLoader = {
  resources: {
    styles: [`
    .tb-table td,.tb-table th{border-width: 1px; border-style: solid;}
   .tb-table {border-spacing: 0; border-collapse: collapse; width: 100%; }
   .tb-table-textbus td, th {border-color: #aaa;}`]
  },
  match(element: HTMLElement): boolean {
    return element.tagName === 'TABLE'
  },
  read(element: HTMLTableElement, injector: Injector, slotParser: SlotParser): ComponentInstance {
    const {tHead, tBodies, tFoot} = element
    const headers: Slot[][] = []
    const bodies: Slot[][] = []
    if (tHead) {
      Array.from(tHead.rows).forEach(row => {
        const arr: Slot[] = []
        headers.push(arr)
        Array.from(row.cells).forEach(cell => {
          const slot = createCell(cell.colSpan, cell.rowSpan)
          arr.push(slot)
          slotParser(slot, cell)
        })
      })
    }

    if (tBodies) {
      Array.of(...Array.from(tBodies), tFoot || {rows: []}).reduce((value, next) => {
        return value.concat(Array.from(next.rows))
      }, [] as HTMLTableRowElement[]).forEach((row: HTMLTableRowElement) => {
        const arr: Slot[] = []
        bodies.push(arr)
        Array.from(row.cells).forEach(cell => {
          const slot = createCell(cell.colSpan, cell.rowSpan)
          arr.push(slot)
          slotParser(slot, cell)
        })
      })
    }
    bodies.unshift(...headers)
    const cells = autoComplete(bodies)
    return tableComponent.createInstance(injector, {
      slots: bodies.flat(),
      state: {
        useTextbusStyle: element.classList.contains('tb-table-textbus'),
        columnCount: cells[0].map(i => i.state!.colspan).reduce((v, n) => v + n, 0),
        rowCount: cells.length
      }
    })
  },
  component: tableComponent
}
