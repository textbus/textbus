import { Formatter } from './formatter';

export interface CellPosition {
  element: HTMLTableCellElement;
  rowIndex: number;
  columnIndex: number;
  columnToEndOffset: number;
  rowToEndOffset: number;
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

  addColumnToLeft(cellMatrix: CellPosition[][], index: number) {
    cellMatrix.forEach(row => {
      const el = row[index].element;
      if (el.colSpan > row[index].columnToEndOffset) {
        el.colSpan++;
      } else {
        el.parentNode.insertBefore(document.createElement(el.tagName), el);
      }
    });
  }

  addColumnToRight(cellMatrix: CellPosition[][], index: number) {
    cellMatrix.forEach(row => {
      const el = row[index].element;
      const newNode = document.createElement(el.tagName);
      if (row[index].columnToEndOffset > 1) {
        el.colSpan++;
      } else if (el.nextElementSibling) {
        el.parentNode.insertBefore(newNode, el.nextElementSibling);
      } else {
        el.parentNode.appendChild(newNode);
      }
    });
  }

  addRowToTop() {
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
