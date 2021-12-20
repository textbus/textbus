import { Injector } from '@tanbo/di'
import { ComponentLoader, SlotParser } from '@textbus/browser'
import {
  ComponentInstance,
  ContentType,
  defineComponent, onContextMenu,
  Slot,
  SlotLiteral,
  SlotRender, TBSelection,
  Translator, useContext, useSelf,
  useSlots, useState,
  VElement
} from '@textbus/core'

import { I18n } from '../i18n'
import {
  TableCellPosition,
  useTableMultipleRange,
  serialize,
  autoComplete,
  slotsToTable, TableInfo
} from './_utils/table-multiple-range'

export interface TableCellLiteral {
  colspan: number
  rowspan: number
}

export interface TableConfig {
  useTextBusStyle: boolean
  cells: TableCellSlot[][]
}

export interface TableLiteral {
  useTextBusStyle: boolean
  cells: SlotLiteral<TableCellLiteral>[][]
}

export class TableCellSlot extends Slot<TableCellLiteral> {
  constructor(colspan = 1, rowspan = 1) {
    super([
      ContentType.Text
    ], {
      colspan,
      rowspan
    })
  }
}

export const tableComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'TableComponent',
  transform(translator: Translator, state: TableLiteral): TableConfig {
    return {
      cells: state.cells.map<TableCellSlot[]>(i => {
        return i.map<TableCellSlot>(j => {
          const slot = new TableCellSlot(j.state!.colspan, j.state!.rowspan)
          return translator.fillSlot(j, slot)
        })
      }),
      useTextBusStyle: state.useTextBusStyle
    }
  },
  setup(config: TableConfig) {
    let tableCells = autoComplete(config.cells)
    const injector = useContext()
    const i18n = injector.get(I18n)
    const selection = injector.get(TBSelection)

    let tableInfo: TableInfo = {
      columnSize: tableCells[0].map(i => i.state!.colspan).reduce((v, n) => v + n, 0),
      rowSize: tableCells.length
    }

    const stateController = useState(tableInfo)

    stateController.onChange.subscribe(s => {
      tableInfo = s
    })

    const self = useSelf()
    const slots = useSlots<TableCellSlot, SlotLiteral<TableCellLiteral>>(tableCells.flat(), state => {
      return new TableCellSlot(state.state!.colspan, state.state!.rowspan)
    })

    let startPosition: TableCellPosition
    let endPosition: TableCellPosition
    useTableMultipleRange(slots, stateController, tableInfo, tableRange => {
      startPosition = tableRange.startPosition
      endPosition = tableRange.endPosition
    })

    onContextMenu(() => {
      return [{
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
        newNode!.cell.setState({
          rowspan: maxRow - minRow,
          colspan: maxColumn - minColumn
        })

        selectedCells.forEach(cell => {
          slots.remove(cell.cell)
        })

        if (selection.startSlot !== newNode!.cell) {
          selection.setStart(newNode!.cell, 0)
        }
        if (selection.endSlot !== newNode!.cell) {
          selection.setEnd(newNode!.cell, newNode!.cell.length)
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
                td.cell.setState({
                  rowspan: 1,
                  colspan: 1
                })
              }
              return td.cell
            }
            return new TableCellSlot()
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

        stateController.update({
          columnSize: tableInfo.columnSize - (endIndex - startIndex + 1),
          rowSize: tableInfo.rowSize
        })

        serializedCells.forEach(tr => {
          for (let i = startIndex; i <= endIndex; i++) {
            const td = tr.cellsPosition[i]
            const startColumnIndex = td.columnIndex - td.offsetColumn
            if (startColumnIndex < startIndex) {
              if (startColumnIndex + td.cell.state!.colspan > endIndex) {
                td.cell.setState({
                  colspan: td.cell.state!.colspan - (endIndex - startIndex + 1),
                  rowspan: td.cell.state!.rowspan
                })
              } else {
                td.cell.setState({
                  colspan: startIndex - td.columnIndex,
                  rowspan: td.cell.state!.rowspan
                })
              }
            } else {
              if (startColumnIndex + td.cell.state!.colspan - 1 > endIndex) {
                td.cell.setState({
                  colspan: td.cell.state!.colspan - (endIndex - startIndex + 1),
                  rowspan: td.cell.state!.rowspan
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

        stateController.update({
          rowSize: tableInfo.rowSize - (endIndex - startIndex + 1),
          columnSize: tableInfo.columnSize
        })

        for (let i = startIndex; i <= endIndex; i++) {
          const tr = serializedCells[i]
          tr.cellsPosition.forEach(td => {
            const startRowIndex = td.rowIndex - td.offsetRow
            if (startRowIndex < startIndex) {
              if (startRowIndex + td.cell.state!.rowspan > endIndex) {
                td.cell.setState({
                  rowspan: td.cell.state!.rowspan - (endIndex - startIndex + 1),
                  colspan: td.cell.state!.colspan
                })
              } else {
                td.cell.setState({
                  rowspan: startIndex - td.rowIndex,
                  colspan: td.cell.state!.colspan
                })
              }
            } else {
              if (startRowIndex + td.cell.state!.rowspan - 1 > endIndex) {
                td.cell.setState({
                  rowspan: td.cell.state!.rowspan - (endIndex - startIndex + 1),
                  colspan: td.cell.state!.colspan
                })
                td.cell.cut()
                const nextTr = serializedCells[i + 1]
                const afterTd = nextTr.cellsPosition.find(td2 => td2.cell === td.cell)!
                afterTd.row.splice(afterTd.row.indexOf(afterTd.cell), 0, td.cell)
              } else {
                slots.remove(td.cell)
              }
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
        const tr: TableCellSlot[] = []
        if (index === 0 || index === serializedCells.length) {
          for (let i = 0; i < tableInfo.columnSize; i++) {
            tr.push(new TableCellSlot())
          }
          if (index === 0) {
            slots.insertByIndex(tr, 0)
          } else {
            slots.insertByIndex(tr, slots.length)
          }
          return
        }

        const row = serializedCells[index]

        stateController.update({
          rowSize: tableInfo.rowSize + 1,
          columnSize: tableInfo.columnSize
        })

        row.cellsPosition.forEach(cell => {
          if (cell.offsetRow < cell.cell.state!.rowspan - 1) {
            if (cell.offsetColumn === 0) {
              cell.cell.setState({
                colspan: cell.cell.state!.colspan,
                rowspan: cell.cell.state!.rowspan + 1
              })
            }
          } else {
            tr.push(new TableCellSlot())
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
        if (index > tableInfo.columnSize) {
          index = tableInfo.columnSize
        }
        const serializedCells = serialize(tableCells)

        const table: TableCellSlot[][] = serializedCells.map(tr => {
          return tr.cellsPosition.map(td => {
            return td.cell
          })
        })

        const recordCells: TableCellSlot[] = []
        serializedCells.forEach((row, rowIndex) => {
          if (index === 0) {
            table[rowIndex].unshift(new TableCellSlot())
          } else if (index === tableInfo.columnSize) {
            table[rowIndex].push(new TableCellSlot())
          } else {
            const cell = row.cellsPosition[index]
            if (cell.offsetColumn > 0) {
              if (recordCells.includes(cell.cell)) {
                return
              }
              cell.cell.setState({
                colspan: cell.cell.state!.colspan + 1,
                rowspan: cell.cell.state!.rowspan
              })
              recordCells.push(cell.cell)
            } else {
              table[rowIndex].splice(index, 0, new TableCellSlot())
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

        stateController.update({
          columnSize: tableInfo.columnSize + 1,
          rowSize: tableInfo.rowSize
        })
      },
      render(isOutputMode: boolean, slotRender: SlotRender) {
        tableCells = slotsToTable(slots.toArray(), tableInfo.columnSize)
        const table = new VElement('table')
        if (config.useTextBusStyle) {
          table.classes.add('tb-table')
        }
        if (tableCells.length) {
          const body = new VElement('tbody')
          table.appendChild(body)
          for (const row of tableCells) {
            const tr = new VElement('tr')
            body.appendChild(tr)
            for (const col of row) {
              tr.appendChild(slotRender(col, () => {
                const td = new VElement('td')
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
      },
      toJSON(): TableLiteral {
        return {
          useTextBusStyle: config.useTextBusStyle,
          cells: tableCells.map(i => {
            return i.map(j => {
              return j.toJSON()
            })
          })
        }
      }
    }
    return instance
  }
})

export const tableComponentLoader: ComponentLoader = {
  resources: {
    styles: [`
    td,th{border-width: 1px; border-style: solid;}
   table {border-spacing: 0; border-collapse: collapse; width: 100%; }
   .tb-table td, th {border-color: #aaa;}`]
  },
  match(element: HTMLElement): boolean {
    return element.tagName === 'TABLE'
  },
  read(element: HTMLTableElement, injector: Injector, slotParser: SlotParser): ComponentInstance {
    const {tHead, tBodies, tFoot} = element
    const headers: TableCellSlot[][] = []
    const bodies: TableCellSlot[][] = []
    if (tHead) {
      Array.from(tHead.rows).forEach(row => {
        const arr: TableCellSlot[] = []
        headers.push(arr)
        Array.from(row.cells).forEach(cell => {
          const slot = new TableCellSlot(cell.colSpan, cell.rowSpan)
          arr.push(slot)
          slotParser(slot, cell)
        })
      })
    }

    if (tBodies) {
      Array.of(...Array.from(tBodies), tFoot || {rows: []}).reduce((value, next) => {
        return value.concat(Array.from(next.rows))
      }, [] as HTMLTableRowElement[]).forEach((row: HTMLTableRowElement) => {
        const arr: TableCellSlot[] = []
        bodies.push(arr)
        Array.from(row.cells).forEach(cell => {
          const slot = new TableCellSlot(cell.colSpan, cell.rowSpan)
          arr.push(slot)
          slotParser(slot, cell)
        })
      })
    }
    bodies.unshift(...headers)
    return tableComponent.createInstance(injector, {
      cells: bodies,
      useTextBusStyle: element.classList.contains('tb-table')
    })
  },
  component: tableComponent
}
