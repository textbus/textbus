import { fromEvent, merge, Subscription } from 'rxjs';

import { findElementByTagName } from '../../edit-frame/utils';
import { EditContext, Hooks } from '../../help';

interface CellPosition {
  element: HTMLTableCellElement;
  rowIndex: number;
  columnIndex: number;
  colSpan: number;
  rowSpan: number;
}

export class TableEditHook implements Hooks {
  private id = ('id' + Math.random()).replace(/\./, '');
  private mask = document.createElement('div');
  private selectedCells: HTMLTableCellElement[] = [];

  constructor() {
    this.mask.style.cssText = 'position: absolute; background: rgba(18,150,219,.1); pointer-events: none;';
  }

  setup(frameContainer: HTMLElement, context: EditContext): void {
    const frameDocument = context.document;
    const frameWindow = context.window;
    const childBody = frameDocument.body;
    let insertMask = false;
    let insertStyle = false;
    let style = frameDocument.createElement('style');
    style.id = this.id;
    style.innerText = '::selection { background: transparent; }';

    let unBindScroll: Subscription;

    fromEvent(childBody, 'mousedown').subscribe(startEvent => {
      this.selectedCells = [];
      if (insertStyle) {
        frameDocument.getSelection().removeAllRanges();
        frameDocument.head.removeChild(style);
        insertStyle = false;
      }
      if (insertMask) {
        frameContainer.removeChild(this.mask);
        insertMask = false;
        unBindScroll && unBindScroll.unsubscribe();
      }
      const startPaths = Array.from(startEvent.composedPath()) as Array<Node>;
      const startTd = findElementByTagName(startPaths, ['td', 'th']) as HTMLTableCellElement;
      const startTable = findElementByTagName(startPaths, 'table') as HTMLTableElement;
      let targetTd: HTMLTableCellElement;
      if (!startTd || !startTable) {
        return;
      }

      const cellMatrix = this.serialize(startTable);


      unBindScroll = merge(...[
        'scroll',
        'resize'
      ].map(type => fromEvent(frameWindow, type))).subscribe(() => {
        if (targetTd) {
          this.findSelectedCellsAndUpdateMaskStyle(cellMatrix, startTd, targetTd);
        }
      });


      const unBindMouseover = fromEvent(childBody, 'mouseover').subscribe(mouseoverEvent => {
        const paths = Array.from(mouseoverEvent.composedPath()) as Array<Node>;
        const currentTable = findElementByTagName(paths, 'table');
        if (currentTable !== startTable) {
          return;
        }
        targetTd = findElementByTagName(paths, ['td', 'th']) as HTMLTableCellElement || targetTd;
        if (targetTd) {
          if (targetTd !== startTd) {
            frameDocument.head.appendChild(style);
            insertStyle = true;
          }
          if (!insertMask) {
            frameContainer.appendChild(this.mask);
            insertMask = true;
          }
          this.findSelectedCellsAndUpdateMaskStyle(cellMatrix, startTd, targetTd);
        }
      });

      const unBindMouseup = merge(...[
        'mouseleave',
        'mouseup'
      ].map(type => fromEvent(childBody, type))).subscribe(() => {
        unBindMouseover.unsubscribe();
        unBindMouseup.unsubscribe();
      });
    });

  }

  onSelectionChange(range: Range, context: EditContext): Range | Range[] {
    if (this.selectedCells.length) {
      return this.selectedCells.map(cell => {
        const range = context.document.createRange();
        range.selectNodeContents(cell);
        return range;
      });
    }
    return range;
  }

  onOutput(head: HTMLHeadElement, body: HTMLBodyElement): void {
    const style = head.querySelector('#' + this.id);
    if (style) {
      style.parentNode.removeChild(style);
    }
  }

  private findSelectedCellsAndUpdateMaskStyle(cellMatrix: CellPosition[][],
                                              startCell: HTMLTableCellElement,
                                              endCell: HTMLTableCellElement) {
    const startPosition = this.findCellPosition(cellMatrix, startCell);
    const endPosition = this.findCellPosition(cellMatrix, endCell);

    const minColumnIndex = Math.min(startPosition.columnIndex, endPosition.columnIndex);
    const maxColumnIndex = Math.max(startPosition.columnIndex, endPosition.columnIndex);
    const minRowIndex = Math.min(startPosition.rowIndex, endPosition.rowIndex);
    const maxRowIndex = Math.max(startPosition.rowIndex, endPosition.rowIndex);

    const top = cellMatrix[minRowIndex].slice(minColumnIndex, maxColumnIndex + 1).map(cell => {
      return {
        top: cell.element.getBoundingClientRect().top,
        cell
      }
    }).sort((n, m) => {
      return n.top - m.top;
    }).shift();

    const left = cellMatrix.slice(minRowIndex, maxRowIndex + 1).map(row => {
      return {
        left: row[minColumnIndex].element.getBoundingClientRect().left,
        cell: row[minColumnIndex]
      }
    }).sort((n, m) => {
      return n.left - m.left;
    }).shift();
    const width = cellMatrix.slice(minRowIndex, maxRowIndex + 1).map(row => {
      return {
        width: row[maxColumnIndex].element.getBoundingClientRect().right - left.left,
        cell: row[maxColumnIndex]
      }
    }).sort((n, m) => {
      return n.width - m.width;
    }).pop();
    const height = cellMatrix[maxRowIndex].slice(minColumnIndex, maxColumnIndex + 1).map(cell => {
      return {
        height: cell.element.getBoundingClientRect().bottom - top.top,
        cell
      }
    }).sort((n, m) => {
      return n.height - m.height;
    }).pop();

    this.mask.style.left = left.left + 'px';
    this.mask.style.top = top.top + 'px';
    this.mask.style.width = width.width + 'px';
    this.mask.style.height = height.height + 'px';


    const selectedCells = cellMatrix.slice(top.cell.rowIndex,
      height.cell.rowIndex + height.cell.rowSpan).map(columns => {
      return columns.slice(left.cell.columnIndex + left.cell.colSpan - left.cell.element.colSpan,
        width.cell.columnIndex + width.cell.colSpan);
    }).reduce((a, b) => {
      return a.concat(b);
    }).map(item => item.element);

    this.selectedCells = Array.from(new Set(selectedCells));
  }

  private findCellPosition(cellMatrix: CellPosition[][],
                           cell: HTMLTableCellElement): { rowIndex: number, columnIndex: number } {
    let startRow: number;
    let startColumn: number;

    for (let rowIndex = 0; rowIndex < cellMatrix.length; rowIndex++) {
      let index = cellMatrix[rowIndex].map(item => item.element).indexOf(cell);
      if (index > -1) {
        startRow = rowIndex;
        startColumn = index;
      }
    }
    return {
      rowIndex: startRow,
      columnIndex: startColumn
    };
  }

  private serialize(table: HTMLTableElement): CellPosition[][] {
    const rows: HTMLTableCellElement[][] = [];

    if (table.tHead) {
      Array.from(table.tHead.rows).forEach(tr => {
        rows.push(Array.from(tr.cells));
      });
    }

    if (table.tBodies) {
      Array.from(table.tBodies).forEach(tbody => {
        Array.from(tbody.rows).forEach(tr => {
          rows.push(Array.from(tr.cells));
        });
      });
    }
    if (table.tFoot) {
      Array.from(table.tFoot.rows).forEach(tr => {
        rows.push(Array.from(tr.cells));
      });
    }
    let stop = false;
    let columnIndex = 0;
    const normalizeRows = rows.map(cells => {
      return cells.map(cell => {
        return {
          element: cell,
          rowSpan: cell.rowSpan,
          colSpan: cell.colSpan
        };
      });
    });
    do {
      stop = normalizeRows.map((cells, rowIndex) => {
        const cell = cells[columnIndex];
        if (cell) {
          if (cell.colSpan > 1) {
            cells.splice(columnIndex + 1, 0, {
              element: cell.element,
              colSpan: cell.colSpan - 1,
              rowSpan: cell.rowSpan
            });
          }
          if (cell.rowSpan > 1) {
            normalizeRows[rowIndex + 1].splice(columnIndex, 0, {
              element: cell.element,
              colSpan: cell.colSpan,
              rowSpan: cell.rowSpan - 1
            });
          }
          return true;
        }
        return false;
      }).indexOf(true) > -1;
      columnIndex++;
    } while (stop);

    return normalizeRows.map((cells, rowIndex) => {
      return cells.map((cell, columnIndex) => {
        return {
          element: cell.element,
          rowIndex,
          columnIndex,
          colSpan: cell.colSpan,
          rowSpan: cell.rowSpan
        };
      })
    });
  }
}
