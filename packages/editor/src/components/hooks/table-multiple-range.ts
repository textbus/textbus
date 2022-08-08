import { debounceTime, merge, Subscription } from '@tanbo/stream'
import { createElement, getBoundingClientRect, VIEW_CONTAINER } from '@textbus/browser'
import {
  ChangeController, ComponentInstance, GetRangesEvent,
  ContentType,
  onGetRanges,
  onDestroy,
  Renderer,
  Selection,
  Slot,
  Slots,
  useContext,
  useSelf, Rect
} from '@textbus/core'
import { CubicBezier } from '@tanbo/bezier'

export interface TableSlotState {
  rowspan: number
  colspan: number
}

export type TableCellSlot = Slot<TableSlotState>

interface ElementPosition {
  left: number
  top: number
  width: number
  height: number
}

export interface TableCellPosition {
  beforeCell: TableCellSlot | null
  afterCell: TableCellSlot | null;
  row: TableCellSlot[];
  cell: TableCellSlot,
  rowIndex: number;
  columnIndex: number;
  offsetColumn: number;
  offsetRow: number;
}

export interface TableRange {
  startPosition: TableCellPosition;
  endPosition: TableCellPosition;
  selectedCells: TableCellSlot[];
}

export interface TableRowPosition {
  cells: TableCellSlot[];
  beforeRow: TableCellSlot[];
  afterRow: TableCellSlot[];
  cellsPosition: TableCellPosition[];
}

export interface TableCellRect {
  minRow: number;
  maxRow: number;
  minColumn: number;
  maxColumn: number;
}

export function createCell(colspan = 1, rowspan = 1) {
  return new Slot([
    ContentType.InlineComponent,
    ContentType.Text
  ], {
    rowspan,
    colspan
  })
}

function findCellPosition(cell: TableCellSlot, cellMatrix: TableRowPosition[]): TableCellRect {
  let minRow!: number, maxRow!: number, minColumn!: number, maxColumn!: number

  forA:for (let rowIndex = 0; rowIndex < cellMatrix.length; rowIndex++) {
    const cells = cellMatrix[rowIndex].cellsPosition
    for (let colIndex = 0; colIndex < cells.length; colIndex++) {
      if (cells[colIndex].cell === cell) {
        minRow = rowIndex
        minColumn = colIndex
        break forA
      }
    }
  }

  forB:for (let rowIndex = cellMatrix.length - 1; rowIndex > -1; rowIndex--) {
    const cells = cellMatrix[rowIndex].cellsPosition
    for (let colIndex = cells.length - 1; colIndex > -1; colIndex--) {
      if (cells[colIndex].cell === cell) {
        maxRow = rowIndex
        maxColumn = colIndex
        break forB
      }
    }
  }

  return {
    minRow,
    maxRow,
    minColumn,
    maxColumn
  }
}

function selectCellsByRange(
  minRow: number,
  minColumn: number,
  maxRow: number,
  maxColumn: number,
  cellMatrix: TableRowPosition[]
): TableRange {
  const x1 = -Math.max(...cellMatrix.slice(minRow, maxRow + 1).map(row => row.cellsPosition[minColumn].offsetColumn))
  const x2 = Math.max(...cellMatrix.slice(minRow, maxRow + 1).map(row => {
    return row.cellsPosition[maxColumn].cell.state!.colspan - (row.cellsPosition[maxColumn].offsetColumn + 1)
  }))
  const y1 = -Math.max(...cellMatrix[minRow].cellsPosition.slice(minColumn, maxColumn + 1).map(cell => cell.offsetRow))
  const y2 = Math.max(...cellMatrix[maxRow].cellsPosition.slice(minColumn, maxColumn + 1).map(cell => {
    return cell.cell.state!.rowspan - (cell.offsetRow + 1)
  }))

  if (x1 || y1 || x2 || y2) {
    return selectCellsByRange(minRow + y1, minColumn + x1, maxRow + y2, maxColumn + x2, cellMatrix)
  }

  const startCellPosition = cellMatrix[minRow].cellsPosition[minColumn]
  const endCellPosition = cellMatrix[maxRow].cellsPosition[maxColumn]

  const selectedCells = cellMatrix.slice(startCellPosition.rowIndex, endCellPosition.rowIndex + 1).map(row => {
    return row.cellsPosition.slice(startCellPosition.columnIndex, endCellPosition.columnIndex + 1)
  }).reduce((a, b) => {
    return a.concat(b)
  }).map(item => item.cell)

  return {
    selectedCells: Array.from(new Set(selectedCells)),
    startPosition: startCellPosition,
    endPosition: endCellPosition
  }
}

export function autoComplete(table: TableCellSlot[][]) {
  const newTable: TableCellSlot[][] = []

  table.forEach((tr, rowIndex) => {
    if (!newTable[rowIndex]) {
      newTable[rowIndex] = []
    }
    const row = newTable[rowIndex]

    let startColumnIndex = 0

    tr.forEach(td => {
      while (row[startColumnIndex]) {
        startColumnIndex++
      }

      let maxColspan = 1

      while (maxColspan < td.state!.colspan) {
        if (!row[startColumnIndex + maxColspan]) {
          maxColspan++
        } else {
          break
        }
      }

      td.updateState(draft => {
        draft.rowspan = td.state!.rowspan
        draft.colspan = maxColspan
      })

      for (let i = rowIndex, len = td.state!.rowspan + rowIndex; i < len; i++) {
        if (!newTable[i]) {
          newTable[i] = []
        }
        const row = newTable[i]

        for (let j = startColumnIndex, max = startColumnIndex + maxColspan; j < max; j++) {
          row[j] = td
        }
      }

      startColumnIndex += maxColspan
    })
  })

  const maxColumns = Math.max(...newTable.map(i => i.length))
  newTable.forEach(tr => {
    for (let i = 0; i < maxColumns; i++) {
      if (!tr[i]) {
        tr[i] = createCell()
      }
    }
  })

  const recordCells: TableCellSlot[] = []

  return newTable.map(tr => {
    return tr.filter(td => {
      const is = recordCells.includes(td)
      if (is) {
        return false
      }
      recordCells.push(td)
      return true
    })
  })
}

export function slotsToTable(slots: TableCellSlot[], columnSize: number): TableCellSlot[][] {
  const table: TableCellSlot[][] = []

  let rowIndex = 0
  let columnIndex = 0

  for (let index = 0; index < slots.length; index++) {
    const slot = slots[index]
    const state = slot.state!
    const row = table[rowIndex]
    if (row) {
      let isFull = true
      for (let i = 0; i < columnSize; i++) {
        if (!row[i]) {
          columnIndex = i
          isFull = false
          break
        }
      }
      if (isFull) {
        columnIndex = 0
        rowIndex++
        index--
        continue
      }
    }

    for (let j = rowIndex; j < state.rowspan + rowIndex; j++) {
      if (!table[j]) {
        table[j] = []
      }
      const row = table[j]
      for (let i = columnIndex; i < state.colspan + columnIndex; i++) {
        row[i] = slot
      }
    }
    columnIndex = state.colspan + columnIndex - 1
    if (columnIndex === columnSize - 1) {
      columnIndex = 0
      rowIndex++
    }
  }
  const recordCells: TableCellSlot[] = []
  return table.map(tr => {
    return tr.filter(td => {
      const is = recordCells.includes(td)
      if (is) {
        return false
      }
      recordCells.push(td)
      return true
    })
  })
}

export function serialize(bodies: TableCellSlot[][]): TableRowPosition[] {
  const rows: TableRowPosition[] = []

  for (let i = 0; i < bodies.length; i++) {
    const cells: TableCellPosition[] = []
    bodies[i].forEach((cell, index) => {
      cells.push({
        row: bodies[i],
        beforeCell: bodies[i][index - 1],
        afterCell: bodies[i][index + 1],
        offsetColumn: 0,
        offsetRow: 0,
        columnIndex: index,
        rowIndex: i,
        cell
      })
    })
    rows.push({
      beforeRow: bodies[i - 1] || null,
      afterRow: bodies[i + 1] || null,
      cellsPosition: cells,
      cells: bodies[i]
    })
  }

  let stop = false
  let columnIndex = 0
  const marks: string[] = []
  do {
    let rowIndex = 0
    stop = false
    while (rowIndex < rows.length) {
      const row = rows[rowIndex]
      const cellPosition = row.cellsPosition[columnIndex]
      if (cellPosition) {
        let mark: string
        cellPosition.rowIndex = rowIndex
        cellPosition.columnIndex = columnIndex

        if (cellPosition.offsetColumn + 1 < cellPosition.cell.state!.colspan) {
          mark = `${rowIndex}*${columnIndex + 1}`
          if (marks.indexOf(mark) === -1) {
            row.cellsPosition.splice(columnIndex + 1, 0, {
              beforeCell: cellPosition.beforeCell,
              afterCell: cellPosition.afterCell,
              cell: cellPosition.cell,
              row: row.cells,
              rowIndex,
              columnIndex,
              offsetColumn: cellPosition.offsetColumn + 1,
              offsetRow: cellPosition.offsetRow
            })
            marks.push(mark)
          }
        }
        if (cellPosition.offsetRow + 1 < cellPosition.cell.state!.rowspan) {
          mark = `${rowIndex + 1}*${columnIndex}`
          if (marks.indexOf(mark) === -1) {
            let nextRow = rows[rowIndex + 1]
            if (!nextRow) {
              nextRow = {
                ...row,
                cells: [],
                cellsPosition: []
              }
              rows.push(nextRow)
            }
            const newRowBeforeColumn = nextRow.cellsPosition[columnIndex - 1]
            const newRowAfterColumn = nextRow.cellsPosition[columnIndex]
            nextRow.cellsPosition.splice(columnIndex, 0, {
              beforeCell: newRowBeforeColumn ? newRowBeforeColumn.cell : null,
              afterCell: newRowAfterColumn ? newRowAfterColumn.cell : null,
              row: nextRow.cells,
              cell: cellPosition.cell,
              offsetColumn: cellPosition.offsetColumn,
              offsetRow: cellPosition.offsetRow + 1,
              rowIndex,
              columnIndex,
            })
            marks.push(mark)
          }
        }
        stop = true
      }
      rowIndex++
    }
    columnIndex++
  } while (stop)
  return rows
}

export interface TableConfig {
  useTextbusStyle: boolean,
  columnCount: number
  rowCount: number
}

export function findFocusCell(componentInstance: ComponentInstance, slot: TableCellSlot): TableCellSlot | null {
  while (slot) {
    if (componentInstance.slots.has(slot)) {
      return slot
    }
    slot = slot.parent?.parent as Slot
  }
  return null
}

export function selectCells(startCell: TableCellSlot, endCell: TableCellSlot, componentInstance: ComponentInstance, columnCount: number) {
  const serializedCells = serialize(slotsToTable(componentInstance.slots.toArray() as Slot<TableSlotState>[], columnCount))

  const slots = componentInstance.slots

  if (startCell === slots.first && endCell === slots.last) {
    const last = serializedCells[serializedCells.length - 1].cellsPosition
    const cells = serializedCells.map(i => i.cellsPosition).flat().map(i => i.cell)
    return {
      startPosition: serializedCells[0].cellsPosition[0],
      endPosition: last[last.length - 1],
      selectedCells: Array.from(new Set(cells))
    }
  }

  const p1 = findCellPosition(startCell, serializedCells)
  const p2 = findCellPosition(endCell, serializedCells)
  const minRow = Math.min(p1.minRow, p2.minRow)
  const minColumn = Math.min(p1.minColumn, p2.minColumn)
  const maxRow = Math.max(p1.maxRow, p2.maxRow)
  const maxColumn = Math.max(p1.maxColumn, p2.maxColumn)
  return selectCellsByRange(minRow, minColumn, maxRow, maxColumn, serializedCells)
}

export function useTableMultipleRange(
  slots: Slots,
  stateController: ChangeController<TableConfig>,
  config: TableConfig,
  callback: (tableRange: TableRange) => void) {
  const injector = useContext()
  const renderer = injector.get(Renderer)
  const selection = injector.get(Selection)
  const editorContainer = injector.get(VIEW_CONTAINER)
  const animateBezier = new CubicBezier(0.25, 0.1, 0.25, 0.1)

  const self = useSelf()

  const subs: Subscription[] = [
    stateController.onChange.subscribe(s => {
      config = s
    })
  ]

  const mask = createElement('div', {
    classes: ['textbus-table-editor-mask'],
  })

  let insertMask = false
  let animateId!: number

  function addMask() {
    editorContainer.appendChild(mask)
    insertMask = true
  }

  function removeMask() {
    insertMask = false
    mask.parentNode?.removeChild(mask)
  }

  function animate(start: ElementPosition, target: ElementPosition) {
    cancelAnimationFrame(animateId)

    function toInt(n: number) {
      return n < 0 ? Math.ceil(n) : Math.floor(n)
    }

    let step = 0
    const maxStep = 6
    const animateFn = () => {
      step++
      const ratio = animateBezier.update(step / maxStep).y
      const left = start.left + toInt((target.left - start.left) * ratio)
      const top = start.top + toInt((target.top - start.top) * ratio)
      const width = start.width + toInt((target.width - start.width) * ratio)
      const height = start.height + toInt((target.height - start.height) * ratio)

      mask.style.left = left + 'px'
      mask.style.top = top + 'px'
      mask.style.width = width + 'px'
      mask.style.height = height + 'px'

      if (step < maxStep) {
        animateId = requestAnimationFrame(animateFn)
      }
    }
    animateId = requestAnimationFrame(animateFn)
  }

  function setSelectedCellsAndUpdateMaskStyle(startSlot: TableCellSlot, endSlot: TableCellSlot, offsetRect: Rect) {
    const tableRange = selectCells(startSlot, endSlot, self, config.columnCount)

    callback(tableRange)

    const startPosition = tableRange.startPosition
    const endPosition = tableRange.endPosition

    const startRect = getBoundingClientRect(renderer.getNativeNodeByVNode(renderer.getVNodeBySlot(startPosition.cell!)!) as HTMLElement)
    const endRect = getBoundingClientRect(renderer.getNativeNodeByVNode(renderer.getVNodeBySlot(endPosition.cell!)!) as HTMLElement)

    const maskRect = getBoundingClientRect(mask)

    if (startSlot === endSlot) {
      mask.style.background = 'none'
    } else {
      mask.style.background = ''
    }

    if (insertMask) {
      animate({
        left: maskRect.left - offsetRect.left,
        top: maskRect.top - offsetRect.top,
        width: maskRect.width,
        height: maskRect.height
      }, {
        left: startRect.left - offsetRect.left,
        top: startRect.top - offsetRect.top,
        width: endRect.left + endRect.width - startRect.left,
        height: endRect.top + endRect.height - startRect.top
      })
    } else {
      addMask()
      mask.style.left = startRect.left - offsetRect.left + 'px'
      mask.style.top = startRect.top - offsetRect.top + 'px'
      mask.style.width = endRect.left + endRect.width - startRect.left + 'px'
      mask.style.height = endRect.top + endRect.height - startRect.top + 'px'
    }
    return tableRange
  }

  function updateMaskEffect(event?: GetRangesEvent<any>) {
    const commonAncestorComponent = selection.commonAncestorComponent
    if (commonAncestorComponent === self) {
      const containerRect = getBoundingClientRect(editorContainer)
      const startCell = findFocusCell(self, selection.startSlot!)
      const endCell = findFocusCell(self, selection.endSlot!)
      if (startCell && endCell) {
        const range = setSelectedCellsAndUpdateMaskStyle(startCell, endCell, containerRect)
        if (startCell !== endCell) {
          event?.useRanges(range.selectedCells.map(i => {
            return {
              slot: i,
              startIndex: 0,
              endIndex: i.length
            }
          }))
        }
      }
    } else {
      removeMask()
    }
  }

  onGetRanges(event => {
    updateMaskEffect(event)
  })

  subs.push(
    merge(selection.onChange, renderer.onViewChecked).pipe(debounceTime(1)).subscribe(() => {
      updateMaskEffect()
    })
  )

  onDestroy(() => {
    subs.forEach(i => i.unsubscribe())
    removeMask()
  })
}
