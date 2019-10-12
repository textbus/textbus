import { fromEvent, merge, Subscription } from 'rxjs';

import { Hooks } from '../../edit-frame/edit-frame';
import { findElementByTagName } from '../../edit-frame/utils';

export class TableEditHook implements Hooks {
  private id = ('id' + Math.random()).replace(/\./, '');
  private mask = document.createElement('div');

  constructor() {
    this.mask.style.cssText = 'position: absolute; background: rgba(18,150,219,.1); pointer-events: none;';
  }

  onInit(frameWindow: Window, frameDocument: Document, frameContainer: HTMLElement): void {
    const childBody = frameDocument.body;
    let insertMask = false;
    let insertStyle = false;
    let style = frameDocument.createElement('style');
    style.id = this.id;
    style.innerText = '::selection { background: transparent; }';

    let unBindScroll: Subscription;

    fromEvent(childBody, 'mousedown').subscribe(startEvent => {
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

      const cells = this.serialize(startTable);


      unBindScroll = merge(...[
        'scroll',
        'resize'
      ].map(type => fromEvent(frameWindow, type))).subscribe(() => {
        if (targetTd) {
          this.setMaskStyle(cells, startTd, targetTd);
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
          this.setMaskStyle(cells, startTd, targetTd);
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

  onOutput(head: HTMLHeadElement, body: HTMLBodyElement): void {
    const style = head.querySelector('#' + this.id);
    if (style) {
      style.parentNode.removeChild(style);
    }
  }

  private setMaskStyle(cells: HTMLTableCellElement[][], start: HTMLTableCellElement, target: HTMLTableCellElement) {
    const startPosition = this.findCellPosition(cells, start);
    const endPosition = this.findCellPosition(cells, target);

    const minColumnIndex = Math.min(startPosition.columnIndex, endPosition.columnIndex);
    const maxColumnIndex = Math.max(startPosition.columnIndex, endPosition.columnIndex);
    const minRowIndex = Math.min(startPosition.rowIndex, endPosition.rowIndex);
    const maxRowIndex = Math.max(startPosition.rowIndex, endPosition.rowIndex);

    const top = Math.min(...cells[minRowIndex].slice(minColumnIndex, maxColumnIndex + 1).map(cell => cell.getBoundingClientRect().top));
    const left = Math.min(...cells.slice(minRowIndex, maxRowIndex + 1).map(row => row[minColumnIndex].getBoundingClientRect().left));
    const width = Math.max(...cells.slice(minRowIndex, maxRowIndex + 1).map(row => row[maxColumnIndex].getBoundingClientRect().right - left));
    const height = Math.max(...cells[maxRowIndex].slice(minColumnIndex, maxColumnIndex + 1).map(cell => cell.getBoundingClientRect().bottom - top));

    this.mask.style.left = left + 'px';
    this.mask.style.top = top + 'px';
    this.mask.style.width = width + 'px';
    this.mask.style.height = height + 'px';
  }

  private findCellPosition(cells: HTMLTableCellElement[][],
                           cell: HTMLTableCellElement): { rowIndex: number, columnIndex: number } {
    let startRow: number;
    let startColumn: number;

    for (let rowIndex = 0; rowIndex < cells.length; rowIndex++) {
      let index = cells[rowIndex].indexOf(cell);
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

  private serialize(table: HTMLTableElement): HTMLTableCellElement[][] {
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
            cells.splice(columnIndex, 0, {
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
          cell.colSpan--;
          cell.rowSpan--;
          return true;
        }
        return false;
      }).indexOf(true) > -1;
      columnIndex++;
    } while (stop);

    return normalizeRows.map(cells => {
      return cells.map(cell => cell.element);
    });
  }
}
