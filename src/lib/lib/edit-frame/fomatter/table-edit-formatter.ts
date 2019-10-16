import { Formatter } from './formatter';

export interface CellPosition {
  rowElement: HTMLTableRowElement;
  beforeCell: Element;
  afterCell: Element;
  cellElement: HTMLTableCellElement;
  columnOffset: number;
  rowOffset: number;
  rowIndex?: number;
  columnIndex?: number;
}

export interface RowPosition {
  beforeRow: Element;
  afterRow: Element;
  rowElement: HTMLTableRowElement;
  cells: CellPosition[];
}

export enum TableEditActions {
  AddColumnToLeft,
  AddColumnToRight,
  AddRowToTop,
  AddRowToBottom,
  MergeCells,
  SplitCells,
  DeleteTopRow,
  DeleteBottomRow,
  DeleteLeftColumn,
  DeleteRightColumn
}

export class TableEditFormatter implements Formatter {
  readonly recordHistory = true;

  constructor(public type: TableEditActions) {
  }

  format(): void {
  }

  addColumnToLeft(cellMatrix: RowPosition[], index: number) {
    cellMatrix.forEach(row => {
      if (index === 0) {
        const cell = row.cells[index];
        const element = cell.cellElement;
        const next = row.rowElement.children[0];
        const newNode = document.createElement(element.tagName);
        if (next) {
          row.rowElement.insertBefore(newNode, next);
        } else {
          row.rowElement.appendChild(newNode)
        }
      } else {
        const cell = row.cells[index];
        if (cell.columnOffset === 0) {
          const el = document.createElement(cell.cellElement.tagName);
          row.rowElement.insertBefore(el,
            cell.cellElement.parentNode === row.rowElement ? cell.cellElement : cell.afterCell);
        } else if (cell.rowOffset === 0) {
          cell.cellElement.colSpan++;
        }
      }
    });
  }

  addColumnToRight(cellMatrix: RowPosition[], index: number) {
    cellMatrix.forEach(row => {
      if (index === row.cells.length) {
        const cell = row.cells[index];
        const element = cell.cellElement;
        const newNode = document.createElement(element.tagName);
        row.rowElement.appendChild(newNode)
      } else {
        const cell = row.cells[index];

        if (cell.columnOffset + 1 < cell.cellElement.colSpan) {
          if (cell.rowOffset === 0) {
            cell.cellElement.colSpan++;
          }
        } else {
          const newNode = document.createElement(cell.cellElement.tagName);
          if (cell.afterCell) {
            cell.rowElement.insertBefore(newNode, cell.afterCell);
          } else {
            cell.rowElement.appendChild(newNode);
          }
        }
      }
    });
  }

  addRowToTop(cellMatrix: RowPosition[], index: number) {
    console.log(index)
    const tr = document.createElement('tr');

    const tagName = cellMatrix[index].cells[0].cellElement.tagName;
    if (index === 0) {
      cellMatrix[index].cells.forEach(() => {
        tr.appendChild(document.createElement(tagName));
      });
    } else {
      cellMatrix[index - 1].cells.forEach(cell => {
        if (cell.rowOffset === 1) {
          const el = document.createElement(tagName) as HTMLTableCellElement;
          tr.appendChild(el);
        } else {
          if (cell.columnOffset === 1) {
            cell.cellElement.rowSpan++;
          }
        }
      });
    }
    cellMatrix[index].rowElement.parentNode.insertBefore(tr, cellMatrix[index].rowElement);
  }

  addRowToBottom() {
  }

  mergeCells() {
  }

  splitCells() {
  }

  deleteTopRow() {
  }

  deleteBottomRow() {
  }

  deleteLeftColumn() {
  }

  deleteRightColumn() {
  }
}
