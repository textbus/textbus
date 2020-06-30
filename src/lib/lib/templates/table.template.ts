import {
  BackboneTemplate,
  EventType,
  Fragment,
  LeafTemplate,
  SlotMap,
  TemplateTranslator,
  VElement,
  ViewData
} from '../core/_api';
import { SingleTagTemplate } from './single-tag.template';

export interface TableCell {
  colspan: number;
  rowspan: number;
  fragment: Fragment;
}

export interface TableCellPosition {
  beforeCell: TableCell;
  afterCell: TableCell;
  row: TableCell[];
  cell: TableCell,
  rowIndex: number;
  columnIndex: number;
  offsetColumn: number;
  offsetRow: number;
}

export interface TableRowPosition {
  cells: TableCell[];
  beforeRow: TableCell[];
  afterRow: TableCell[];
  cellsPosition: TableCellPosition[];
}

export interface TableInitParams {
  headers?: TableCell[][];
  bodies: TableCell[][];
}

export interface TableCellRect {
  minRow: number;
  maxRow: number;
  minColumn: number;
  maxColumn: number;
}

export interface TableRange {
  startCellPosition: TableCellPosition;
  endCellPosition: TableCellPosition;
  selectedCells: Fragment[];
}

export class TableTemplateTranslator implements TemplateTranslator {
  private tagName = 'table';

  match(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLTableElement): ViewData {
    const {tHead, tBodies, tFoot} = el;
    const slots: SlotMap[] = [];
    const headers: TableCell[][] = [];
    const bodies: TableCell[][] = [];
    if (tHead) {
      Array.from(tHead.rows).forEach(row => {
        const arr: TableCell[] = [];
        headers.push(arr);
        Array.from(row.cells).forEach(cell => {
          const fragment = new Fragment();
          arr.push({
            rowspan: cell.rowSpan,
            colspan: cell.colSpan,
            fragment
          });
          slots.push({
            from: cell,
            toSlot: fragment
          });
        })
      });
    }

    if (tBodies) {
      Array.of(...Array.from(tBodies), tFoot || {rows: []}).reduce((value, next) => {
        return value.concat(Array.from(next.rows));
      }, [] as HTMLTableRowElement[]).forEach(row => {
        const arr: TableCell[] = [];
        bodies.push(arr);
        Array.from(row.cells).forEach(cell => {
          const fragment = new Fragment();
          arr.push({
            rowspan: cell.rowSpan,
            colspan: cell.colSpan,
            fragment
          });
          slots.push({
            from: cell,
            toSlot: fragment
          });
        })
      });
    }

    return {
      template: new TableTemplate({
        headers,
        bodies
      }),
      childrenSlots: slots
    };
  }
}

export class TableTemplate extends BackboneTemplate {
  get cellMatrix() {
    const n = this.serialize();
    this._cellMatrix = n;
    return n;
  }

  private _cellMatrix: TableRowPosition[];

  constructor(public config: TableInitParams) {
    super('table');
    const bodyConfig = config.bodies;
    for (const row of bodyConfig) {
      for (const col of row) {
        this.childSlots.push(col.fragment);
      }
    }
  }

  clone() {
    const template = new TableTemplate(this.config);
    this.childSlots.forEach(f => {
      template.childSlots.push(f.clone());
    });
    return template;
  }

  render() {
    const table = new VElement(this.tagName);
    this.viewMap.clear();
    this.childSlots = [];
    const bodyConfig = this.config.bodies;
    if (bodyConfig.length) {
      const body = new VElement('tbody');
      table.appendChild(body);
      for (const row of bodyConfig) {
        const tr = new VElement('tr');
        body.appendChild(tr);
        for (const col of row) {
          const td = new VElement('td');
          if (col.colspan > 1) {
            td.attrs.set('colSpan', col.colspan);
          }
          if (col.rowspan > 1) {
            td.attrs.set('rowSpan', col.rowspan);
          }
          if (col.fragment.contentLength === 0) {
            col.fragment.append(new SingleTagTemplate('br'));
          }
          this.childSlots.push(col.fragment);
          this.viewMap.set(col.fragment, td);
          tr.appendChild(td);
          td.events.subscribe(event => {
            if (event.type === EventType.onEnter) {
              const firstRange = event.selection.firstRange;
              col.fragment.insert(new SingleTagTemplate('br'), firstRange.startIndex);
              firstRange.startIndex = firstRange.endIndex = firstRange.startIndex + 1;
              const afterContent = col.fragment.sliceContents(firstRange.startIndex, firstRange.startIndex + 1)[0];
              if (typeof afterContent === 'string' || afterContent instanceof LeafTemplate) {
                event.stopPropagation();
                return;
              }
              col.fragment.insert(new SingleTagTemplate('br'), firstRange.startIndex);
            } else if (event.type === EventType.onDelete && event.selection.firstRange.startIndex === 0) {
              event.stopPropagation();
            }
          })
        }
      }
    }
    return table;
  }

  selectCells(startCell: Fragment, endCell: Fragment) {
    this._cellMatrix = this.serialize();
    const p1 = this.findCellPosition(startCell);
    const p2 = this.findCellPosition(endCell);
    const minRow = Math.min(p1.minRow, p2.minRow);
    const minColumn = Math.min(p1.minColumn, p2.minColumn);
    const maxRow = Math.max(p1.maxRow, p2.maxRow);
    const maxColumn = Math.max(p1.maxColumn, p2.maxColumn);
    return this.selectCellsByRange(minRow, minColumn, maxRow, maxColumn);
  }

  private selectCellsByRange(minRow: number, minColumn: number, maxRow: number, maxColumn: number): TableRange {
    const cellMatrix = this._cellMatrix;
    const x1 = -Math.max(...cellMatrix.slice(minRow, maxRow + 1).map(row => row.cellsPosition[minColumn].offsetColumn));
    const x2 = Math.max(...cellMatrix.slice(minRow, maxRow + 1).map(row => {
      return row.cellsPosition[maxColumn].cell.colspan - (row.cellsPosition[maxColumn].offsetColumn + 1);
    }));
    const y1 = -Math.max(...cellMatrix[minRow].cellsPosition.slice(minColumn, maxColumn + 1).map(cell => cell.offsetRow));
    const y2 = Math.max(...cellMatrix[maxRow].cellsPosition.slice(minColumn, maxColumn + 1).map(cell => {
      return cell.cell.rowspan - (cell.offsetRow + 1);
    }));

    if (x1 || y1 || x2 || y2) {
      return this.selectCellsByRange(minRow + y1, minColumn + x1, maxRow + y2, maxColumn + x2);
    }

    const startCellPosition = cellMatrix[minRow].cellsPosition[minColumn];
    const endCellPosition = cellMatrix[maxRow].cellsPosition[maxColumn];

    const selectedCells = cellMatrix.slice(startCellPosition.rowIndex, endCellPosition.rowIndex + 1).map(row => {
      return row.cellsPosition.slice(startCellPosition.columnIndex, endCellPosition.columnIndex + 1);
    }).reduce((a, b) => {
      return a.concat(b);
    }).map(item => item.cell.fragment);

    return {
      selectedCells: Array.from(new Set(selectedCells)),
      startCellPosition,
      endCellPosition
    }
  }

  private findCellPosition(cell: Fragment): TableCellRect {
    const cellMatrix = this._cellMatrix;
    let minRow: number, maxRow: number, minColumn: number, maxColumn: number;

    forA:for (let rowIndex = 0; rowIndex < cellMatrix.length; rowIndex++) {
      const cells = cellMatrix[rowIndex].cellsPosition;
      for (let colIndex = 0; colIndex < cells.length; colIndex++) {
        if (cells[colIndex].cell.fragment === cell) {
          minRow = rowIndex;
          minColumn = colIndex;
          break forA;
        }
      }
    }

    forB:for (let rowIndex = cellMatrix.length - 1; rowIndex > -1; rowIndex--) {
      const cells = cellMatrix[rowIndex].cellsPosition;
      for (let colIndex = cells.length - 1; colIndex > -1; colIndex--) {
        if (cells[colIndex].cell.fragment === cell) {
          maxRow = rowIndex;
          maxColumn = colIndex;
          break forB;
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

  private serialize(): TableRowPosition[] {
    const rows: TableRowPosition[] = [];

    const bodies = this.config.bodies;
    for (let i = 0; i < bodies.length; i++) {
      const cells: TableCellPosition[] = [];
      bodies[i].forEach((cell, index) => {
        cells.push({
          row: bodies[i],
          beforeCell: bodies[i][index - 1],
          afterCell: bodies[i][index + 1],
          offsetColumn: 0,
          offsetRow: 0,
          columnIndex: null,
          rowIndex: null,
          cell
        })
      })
      rows.push({
        beforeRow: bodies[i - 1] || null,
        afterRow: bodies[i + 1] || null,
        cellsPosition: cells,
        cells: bodies[i]
      });
    }

    let stop = false;
    let columnIndex = 0;
    const marks: string[] = [];
    do {
      let rowIndex = 0;
      stop = false;
      while (rowIndex < rows.length) {
        const row = rows[rowIndex];
        const cellPosition = row.cellsPosition[columnIndex];
        if (cellPosition) {
          let mark: string;
          cellPosition.rowIndex = rowIndex;
          cellPosition.columnIndex = columnIndex;

          if (cellPosition.offsetColumn + 1 < cellPosition.cell.colspan) {
            mark = `${rowIndex}*${columnIndex + 1}`;
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
              });
              marks.push(mark);
            }
          }
          if (cellPosition.offsetRow + 1 < cellPosition.cell.rowspan) {
            mark = `${rowIndex + 1}*${columnIndex}`;
            if (marks.indexOf(mark) === -1) {
              let nextRow = rows[rowIndex + 1];
              if (!nextRow) {
                nextRow = {
                  ...row,
                  cells: [],
                  cellsPosition: []
                };
                rows.push(nextRow);
              }
              const newRowBeforeColumn = nextRow.cellsPosition[columnIndex - 1];
              const newRowAfterColumn = nextRow.cellsPosition[columnIndex];
              nextRow.cellsPosition.splice(columnIndex, 0, {
                beforeCell: newRowBeforeColumn ? newRowBeforeColumn.cell : null,
                afterCell: newRowAfterColumn ? newRowAfterColumn.cell : null,
                row: nextRow.cells,
                cell: cellPosition.cell,
                offsetColumn: cellPosition.offsetColumn,
                offsetRow: cellPosition.offsetRow + 1,
                rowIndex,
                columnIndex,
              });
              marks.push(mark);
            }
          }
          stop = true;
        }
        rowIndex++;
      }
      columnIndex++;
    } while (stop);
    return rows;
  }
}
