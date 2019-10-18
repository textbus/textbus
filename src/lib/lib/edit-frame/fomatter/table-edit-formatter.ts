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
    const tr = document.createElement('tr');
    const row = cellMatrix[index];
    const tagName = row.cells[0].cellElement.tagName;
    if (index === 0) {
      cellMatrix[0].cells.forEach(() => {
        tr.appendChild(document.createElement(tagName));
      });

    } else {
      row.cells.forEach(cell => {
        if (cell.rowOffset > 0) {
          if (cell.columnOffset === 0) {
            cell.cellElement.rowSpan++;
          }
        } else {
          tr.appendChild(document.createElement(tagName));
        }
      });
    }
    row.rowElement.parentNode.insertBefore(tr, row.rowElement);
  }

  addRowToBottom(cellMatrix: RowPosition[], index: number) {
    const tr = document.createElement('tr');
    const row = cellMatrix[index];
    const tagName = row.cells[0].cellElement.tagName;
    if (index === cellMatrix.length) {
      cellMatrix[0].cells.forEach(() => {
        tr.appendChild(document.createElement(tagName));
      });
    } else {
      row.cells.forEach(cell => {
        if (cell.rowOffset < cell.cellElement.rowSpan - 1) {
          if (cell.columnOffset === 0) {
            cell.cellElement.rowSpan++;
          }
        } else {
          tr.appendChild(document.createElement(tagName));
        }
      });
    }
    if (row.afterRow) {
      row.rowElement.parentNode.insertBefore(tr, row.afterRow);
    } else {
      row.rowElement.parentNode.appendChild(tr);
    }
  }

  mergeCells(cellMatrix: RowPosition[], minRow: number, minColumn: number, maxRow: number, maxColumn: number): HTMLTableCellElement {
    const cells = cellMatrix.slice(minRow, maxRow + 1)
      .map(row => row.cells.slice(minColumn, maxColumn + 1).map(cell => cell.cellElement))
      .reduce((p, n) => {
        return p.concat(n);
      });
    const selectedCells = Array.from(new Set(cells));
    const newNode = selectedCells.shift();
    newNode.rowSpan = maxRow - minRow + 1;
    newNode.colSpan = maxColumn - minColumn + 1;
    selectedCells.forEach(cell => {
      cell.parentNode.removeChild(cell);
    });
    return newNode;
  }

  splitCells(cellMatrix: RowPosition[], minRow: number, minColumn: number, maxRow: number, maxColumn: number): {
    startCell: HTMLTableCellElement,
    endCell: HTMLTableCellElement
  } {

    const cells = cellMatrix.slice(minRow, maxRow + 1)
      .map(row => row.cells.slice(minColumn, maxColumn + 1).map(cell => {
        if (cell.rowOffset !== 0 || cell.columnOffset !== 0) {
          cell.cellElement.colSpan = cell.cellElement.rowSpan = 1;
          const newNode = document.createElement(cell.cellElement.tagName) as HTMLTableCellElement;
          if (cell.afterCell) {
            cell.rowElement.insertBefore(newNode, cell.afterCell);
          } else {
            cell.rowElement.appendChild(newNode);
          }
          cell.cellElement = newNode;
        }
        return cell;
      })).reduce((p, c) => {
        return p.concat(c);
      });
    return {
      startCell: cells[0].cellElement,
      endCell: cells[cells.length - 1].cellElement
    }
  }

  deleteTopRow(cellMatrix: RowPosition[], index: number) {
    if (index === 0) {
      return;
    }
    const prevRow = cellMatrix[index - 1];
    prevRow.cells.forEach((cell, cellIndex) => {
      if (cell.columnOffset === 0) {
        if (cell.rowOffset === 0 && cell.cellElement.rowSpan > 1) {
          const newNode = document.createElement(cell.cellElement.tagName) as HTMLTableCellElement;
          newNode.rowSpan = cell.cellElement.rowSpan - 1;
          newNode.colSpan = cell.cellElement.colSpan;
          const newPosition = cellMatrix[index].cells[cellIndex];
          if (newPosition.afterCell) {
            newPosition.rowElement.insertBefore(newNode, newPosition.afterCell);
          } else {
            newPosition.rowElement.appendChild(newNode);
          }
        } else {
          cell.cellElement.rowSpan--;
        }
      }
    });
    prevRow.rowElement.parentNode.removeChild(prevRow.rowElement);
  }

  deleteBottomRow(cellMatrix: RowPosition[], index: number) {
    if (index === cellMatrix.length - 1) {
      return;
    }
    const nextRow = cellMatrix[index + 1];
    nextRow.cells.forEach((cell, cellIndex) => {
      if (cell.columnOffset === 0) {
        if (cell.rowOffset > 0) {
          cell.cellElement.rowSpan--;

        } else if (cell.rowOffset === 0) {

          if (cell.cellElement.rowSpan > 1) {
            const newNode = document.createElement(cell.cellElement.tagName) as HTMLTableCellElement;
            newNode.rowSpan = cell.cellElement.rowSpan - 1;
            newNode.colSpan = cell.cellElement.colSpan;

            const newPosition = cellMatrix[index + 2].cells[cellIndex];
            if (newPosition.afterCell) {
              newPosition.rowElement.insertBefore(newNode, newPosition.afterCell);
            } else {
              newPosition.rowElement.appendChild(newNode);
            }
          }
        }
      }
    });
    nextRow.rowElement.parentNode.removeChild(nextRow.rowElement);
  }

  deleteLeftColumn(cellMatrix: RowPosition[], index: number) {
    if (index === 0) {
      return;
    }
    cellMatrix.forEach(row => {
      const cell = row.cells[index - 1];
      if (cell.rowOffset === 0) {
        if (cell.columnOffset > 0) {
          cell.cellElement.colSpan--;
        } else {
          if (cell.cellElement.colSpan > 1) {
            const newNode = document.createElement(cell.cellElement.tagName) as HTMLTableCellElement;
            newNode.colSpan = cell.cellElement.colSpan - 1;
            newNode.rowSpan = cell.cellElement.rowSpan;
            cell.rowElement.replaceChild(newNode, cell.cellElement);
          } else {
            cell.rowElement.removeChild(cell.cellElement);
          }
        }
      }
    });
  }

  deleteRightColumn(cellMatrix: RowPosition[], index: number) {
    if (index === cellMatrix[0].cells.length - 1) {
      return;
    }
    cellMatrix.forEach(row => {
      const cell = row.cells[index + 1];
      if (cell.rowOffset === 0) {
        if (cell.columnOffset > 0) {
          cell.cellElement.colSpan--;
        } else {
          if (cell.cellElement.colSpan > 1) {
            const newNode = document.createElement(cell.cellElement.tagName) as HTMLTableCellElement;
            newNode.colSpan = cell.cellElement.colSpan - 1;
            newNode.rowSpan = cell.cellElement.rowSpan;
            cell.rowElement.replaceChild(newNode, cell.cellElement);
          } else {
            cell.rowElement.removeChild(cell.cellElement);
          }
        }
      }
    });
  }
}
