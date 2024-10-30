import { ContentType, Slot } from '@textbus/core'
import { v4 } from 'uuid'

import { TableComponentMergeCellConfig } from '../table.component'

export interface TableCellConfig {
  rowspan: number
  colspan: number
  slot: Slot
  id: string
}


/**
 * 修复不规范表格，并补全空位
 * @param table
 */
export function autoComplete(table: TableCellConfig[][]) {
  const newTable: TableCellConfig[][] = []

  table.forEach((tr, rowIndex) => {
    let row = newTable[rowIndex]
    if (!row) {
      row = []
      newTable[rowIndex] = row
    }

    let startColumnIndex = 0

    tr.forEach(td => {
      while (row[startColumnIndex]) {
        startColumnIndex++
      }

      let maxColspan = 1

      while (maxColspan < td.colspan) {
        if (!row[startColumnIndex + maxColspan]) {
          maxColspan++
        } else {
          break
        }
      }

      td.colspan = maxColspan

      for (let i = rowIndex, len = td.rowspan + rowIndex; i < len; i++) {
        let row = newTable[i]
        if (!row) {
          row = []
          newTable[i] = row
        }

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
        tr[i] = {
          id: v4(),
          rowspan: 1,
          colspan: 1,
          slot: new Slot([
            ContentType.BlockComponent
          ])
        }
      }
    }
  })

  const ids: string[] = []
  const mergedConfig: TableComponentMergeCellConfig = {}

  const normalizedTable = newTable.map(tr => {
    return tr.map(td => {
      const is = ids.includes(td.id)
      if (is) {
        return {
          id: v4(),
          slot: new Slot([
            ContentType.BlockComponent,
          ])
        }
      }
      ids.push(td.id)

      return {
        id: td.id,
        slot: td.slot
      }
    })
  })

  ids.length = 0
  newTable.forEach((tr, rowIndex) => {
    tr.forEach((td, colIndex) => {
      if (td.rowspan > 1 || td.colspan > 1) {
        if (ids.includes(td.id)) {
          return
        }

        ids.push(td.id)
        mergedConfig[td.id] = normalizedTable[rowIndex + td.rowspan - 1][colIndex + td.colspan - 1].id
      }
    })
  })

  return {
    mergedConfig,
    table: normalizedTable
  }
}
