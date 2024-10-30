import { Cell, Row } from '../table.component'

export class Rectangle {
  constructor(public x1: number,
              public y1: number,
              public x2: number,
              public y2: number) {
  }

  intersects(other: Rectangle): boolean {
    return this.x1 < other.x2 && this.x2 > other.x1 && this.y1 < other.y2 && this.y2 > other.y1
  }

  merge(other: Rectangle): Rectangle {
    return new Rectangle(
      Math.min(this.x1, other.x1),
      Math.min(this.y1, other.y1),
      Math.max(this.x2, other.x2),
      Math.max(this.y2, other.y2)
    )
  }
}

export function findNonIntersectingRectangles(rectangles: Rectangle[]): Rectangle[] {
  const merged: Rectangle[] = []
  const remaining: Rectangle[] = [...rectangles]

  while (remaining.length > 0) {
    const current = remaining.shift()!
    let mergedWithCurrent = false

    for (let i = 0; i < merged.length; i++) {
      if (current.intersects(merged[i])) {
        merged[i] = current.merge(merged[i])
        mergedWithCurrent = true
        break
      }
    }

    if (!mergedWithCurrent) {
      merged.push(current)
    }
  }

  return merged
}

export function getMaxRectangle(start: Rectangle, rectangles: Rectangle[]): Rectangle {
  let merged = start
  const remaining: Rectangle[] = [...rectangles]

  while (remaining.length > 0) {
    const current = remaining.shift()!
    if (current.intersects(merged)) {
      merged = current.merge(merged)
    }
  }
  return merged
}

export interface RenderRow {
  row: Row
  cells: RenderCell[]
}

export interface RenderCell {
  rowspan: number
  colspan: number
  visible: boolean
  raw: Cell
}

export function applyRectangles(rows: Row[], rectangles: Rectangle[]) {
  const table: RenderRow[] = rows.map(row => {
    return {
      row,
      cells: row.cells.map(cell => {
        return {
          rowspan: 1,
          colspan: 1,
          visible: true,
          raw: cell
        }
      })
    }
  })
  rectangles.forEach(rect => {
    const { x1, y1, x2, y2 } = rect

    const rowspan = y2 - y1
    const colspan = x2 - x1

    for (let i = y1; i < y2; i++) {
      for (let j = x1; j < x2; j++) {
        const item = table[i].cells[j]
        if (i === y1 && j === x1) {
          item.visible = true
          item.rowspan = rowspan
          item.colspan = colspan
        } else {
          item.visible = false
        }
      }
    }
  })

  return table
}
