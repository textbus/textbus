import { Subscription } from '@tanbo/stream'
import { createElement, EDITOR_CONTAINER, SelectionBridge } from '@textbus/browser'
import {
  ChangeController,
  onDestroy,
  Renderer,
  SelectedScope,
  Slot,
  SlotLiteral,
  Slots,
  TBSelection,
  useContext,
  useSelf
} from '@textbus/core'
import { CubicBezier } from '@tanbo/bezier'

import {
  TableCellLiteral,
  TableCellSlot,
} from '../table.component'

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

function selectCellsByRange(minRow: number, minColumn: number, maxRow: number, maxColumn: number, cellMatrix: TableRowPosition[]): TableRange {
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
        tr[i] = new TableCellSlot()
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

export interface TableInfo {
  columnSize: number
  rowSize: number
}

export function useTableMultipleRange(
  slots: Slots<SlotLiteral<TableCellLiteral>, TableCellSlot>,
  stateController: ChangeController<TableInfo>,
  config: TableInfo,
  callback: (tableRange: TableRange) => void) {
  const injector = useContext()
  const nativeSelectionBridge = injector.get(SelectionBridge)
  const renderer = injector.get(Renderer)
  const selection = injector.get(TBSelection)
  const editorContainer = injector.get(EDITOR_CONTAINER)
  const animateBezier = new CubicBezier(0.25, 0.1, 0.25, 0.1)

  const oldGetSelectedScope = selection.getSelectedScopes
  const self = useSelf()

  const subs: Subscription[] = [
    stateController.onChange.subscribe(s => {
      config = s
    })
  ]

  function findFocusCell(slot: TableCellSlot): TableCellSlot | null {
    while (slot) {
      if (slots.has(slot)) {
        return slot
      }
      slot = slot.parent?.parent as Slot
    }
    return null
  }

  const firstMask = createElement('div', {
    classes: ['textbus-table-editor-first-cell']
  })

  const mask = createElement('div', {
    classes: ['textbus-table-editor-mask'],
    children: [
      firstMask
    ]
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

  function animate(start: ElementPosition, target: ElementPosition, firstCellPosition: ElementPosition) {
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

      firstMask.style.left = target.left - left + firstCellPosition.left + 'px'
      firstMask.style.top = target.top - top + firstCellPosition.top + 'px'
      if (step < maxStep) {
        animateId = requestAnimationFrame(animateFn)
      }
    }
    animateId = requestAnimationFrame(animateFn)
  }

  function selectCells(startCell: TableCellSlot, endCell: TableCellSlot) {
    const serializedCells = serialize(slotsToTable(slots.toArray(), config.columnSize))
    const p1 = findCellPosition(startCell, serializedCells)
    const p2 = findCellPosition(endCell, serializedCells)
    const minRow = Math.min(p1.minRow, p2.minRow)
    const minColumn = Math.min(p1.minColumn, p2.minColumn)
    const maxRow = Math.max(p1.maxRow, p2.maxRow)
    const maxColumn = Math.max(p1.maxColumn, p2.maxColumn)
    return selectCellsByRange(minRow, minColumn, maxRow, maxColumn, serializedCells)
  }

  function setSelectedCellsAndUpdateMaskStyle(startSlot: TableCellSlot, endSlot: TableCellSlot) {
    const tableRange = selectCells(startSlot, endSlot)

    callback(tableRange)

    const startPosition = tableRange.startPosition
    const endPosition = tableRange.endPosition
    const selectedCells = tableRange.selectedCells

    selection.getSelectedScopes = function () {
      if (selectedCells.length > 1) {
        return selectedCells.map<SelectedScope>(i => {
          return {
            slot: i,
            startIndex: 0,
            endIndex: i.length
          }
        })
      }
      return oldGetSelectedScope.call(selection)
    }

    // TODO 这里的焦点单元格后面需要更换为第一个选中的单元格
    const firstCellRect = (renderer.getNativeNodeByVNode(renderer.getVNodeBySlot(startSlot)!) as HTMLElement).getBoundingClientRect()
    const startRect = (renderer.getNativeNodeByVNode(renderer.getVNodeBySlot(startPosition.cell!)!) as HTMLElement).getBoundingClientRect()
    const endRect = (renderer.getNativeNodeByVNode(renderer.getVNodeBySlot(endPosition.cell!)!) as HTMLElement).getBoundingClientRect()

    firstMask.style.width = firstCellRect.width + 'px'
    firstMask.style.height = firstCellRect.height + 'px'
    if (insertMask) {
      animate({
        left: mask.offsetLeft,
        top: mask.offsetTop,
        width: mask.offsetWidth,
        height: mask.offsetHeight
      }, {
        left: startRect.left,
        top: startRect.top,
        width: endRect.right - startRect.left,
        height: endRect.bottom - startRect.top
      }, {
        left: firstCellRect.left - startRect.left,
        top: firstCellRect.top - startRect.top,
        width: firstCellRect.width,
        height: firstCellRect.height
      })
    } else {
      addMask()
      mask.style.left = startRect.left + 'px'
      mask.style.top = startRect.top + 'px'
      mask.style.width = endRect.right - startRect.left + 'px'
      mask.style.height = endRect.bottom - startRect.top + 'px'

      firstMask.style.left = firstCellRect.left - startRect.left + 'px'
      firstMask.style.top = firstCellRect.top - startRect.top + 'px'
    }
  }

  function updateMaskEffect() {
    if (selection.commonAncestorComponent === self) {
      const startCell = findFocusCell(selection.startSlot!)
      const endCell = findFocusCell(selection.endSlot!)
      if (startCell === endCell) {
        nativeSelectionBridge.showNativeMask()
      } else {
        nativeSelectionBridge.hideNativeMask()
      }
      if (startCell && endCell) {
        setSelectedCellsAndUpdateMaskStyle(startCell, endCell)
      } else {
        selection.getSelectedScopes = oldGetSelectedScope
      }
    } else {
      removeMask()
      if (selection.commonAncestorComponent?.name !== self.name) {
        nativeSelectionBridge.showNativeMask()
      }
    }
  }

  subs.push(
    selection.onChange.subscribe(() => {
      updateMaskEffect()
    }),
    renderer.onViewChecked.subscribe(() => {
      updateMaskEffect()
    })
  )

  onDestroy(() => {
    selection.getSelectedScopes = oldGetSelectedScope
    subs.forEach(i => i.unsubscribe())
    nativeSelectionBridge.showNativeMask()
    removeMask()
  })
}
