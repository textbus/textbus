import { Formatter } from './formatter';

export interface CellPosition {
  cellElement: HTMLTableCellElement;
  columnToEndOffset: number;
  rowToEndOffset: number;
  rowIndex?: number;
  columnIndex?: number;
}

export interface RowPosition {
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
      const el = row.cells[index].cellElement;
      if (el.colSpan > row.cells[index].columnToEndOffset) {
        el.colSpan++;
      } else {
        el.parentNode.insertBefore(document.createElement(el.tagName), el);
      }
    });
  }

  addColumnToRight(cellMatrix: RowPosition[], index: number) {
    cellMatrix.forEach(row => {
      const el = row.cells[index].cellElement;
      const newNode = document.createElement(el.tagName);
      if (row.cells[index].columnToEndOffset > 1) {
        el.colSpan++;
      } else if (el.nextElementSibling) {
        el.parentNode.insertBefore(newNode, el.nextElementSibling);
      } else {
        el.parentNode.appendChild(newNode);
      }
    });
  }

  addRowToTop(cellMatrix: RowPosition[], index: number) {
    const tr = document.createElement('tr');
    cellMatrix[index].rowElement.parentNode.insertBefore(tr, cellMatrix[index].rowElement);
    const tagName = cellMatrix[index].cells[0].cellElement.tagName;
    if (index === 0) {
      cellMatrix[index].cells.forEach(() => {
        tr.appendChild(document.createElement(tagName));
      });
    } else {
      console.log(cellMatrix[index - 1].cells);
      cellMatrix[index - 1].cells.forEach(cell => {
        if (cell.rowToEndOffset === 1) {
          const el = document.createElement(tagName) as HTMLTableCellElement;
          el.colSpan = cell.cellElement.colSpan;
          tr.appendChild(el);
        } else {
          if (cell.columnToEndOffset === 1) {
            cell.cellElement.rowSpan++;
          }
        }
      });
    }

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
