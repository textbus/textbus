import { fromEvent, merge, Subscription } from 'rxjs';

import { findElementByTagName } from '../../edit-frame/utils';
import { EditContext, Hooks } from '../../help';
import { Matcher } from '../../matcher';
import { Formatter } from '../../edit-frame/fomatter/formatter';
import { TableEditActions, TableEditFormatter, CellPosition } from '../../edit-frame/_api';
import { RowPosition } from '../../edit-frame/fomatter/table-edit-formatter';

export class TableEditHook implements Hooks {
  matcher = new Matcher({
    tags: ['table']
  });

  private id = ('id' + Math.random()).replace(/\./, '');
  private mask = document.createElement('div');
  private firstMask = document.createElement('div');
  private selectedCells: HTMLTableCellElement[] = [];
  private left: CellPosition;
  private right: CellPosition;
  private top: CellPosition;
  private bottom: CellPosition;

  private tableElement: HTMLTableElement;
  private startCell: HTMLTableCellElement;
  private endCell: HTMLTableCellElement;
  private cellMatrix: RowPosition[] = [];

  constructor() {
    this.mask.style.cssText = 'position: absolute; box-shadow: inset 0 0 0 2px #1296db; pointer-events: none; transition: all .1s; overflow: hidden';
    this.firstMask.style.cssText = 'position: absolute; box-shadow: 0 0 0 9999px rgba(18,150,219,.1); contain: style';
    this.mask.appendChild(this.firstMask);
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
      this.startCell = findElementByTagName(startPaths, ['td', 'th']) as HTMLTableCellElement;
      this.tableElement = findElementByTagName(startPaths, 'table') as HTMLTableElement;
      if (!this.startCell || !this.tableElement) {
        return;
      }

      this.cellMatrix = this.serialize(this.tableElement);


      unBindScroll = merge(...[
        'scroll',
        'resize'
      ].map(type => fromEvent(frameWindow, type))).subscribe(() => {
        if (this.endCell) {
          this.setSelectedCellsAndUpdateMaskStyle(this.cellMatrix, this.startCell, this.endCell);
        }
      });


      const unBindMouseover = fromEvent(childBody, 'mouseover').subscribe(mouseoverEvent => {
        const paths = Array.from(mouseoverEvent.composedPath()) as Array<Node>;
        const currentTable = findElementByTagName(paths, 'table');
        if (currentTable !== this.tableElement) {
          return;
        }
        this.endCell = findElementByTagName(paths, ['td', 'th']) as HTMLTableCellElement || this.endCell;
        if (this.endCell) {
          if (this.endCell !== this.startCell) {
            frameDocument.head.appendChild(style);
            insertStyle = true;
          }
          if (!insertMask) {
            frameContainer.appendChild(this.mask);
            insertMask = true;
          }
          this.setSelectedCellsAndUpdateMaskStyle(this.cellMatrix, this.startCell, this.endCell);
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

  onApply(range: Range[], formatter: Formatter, context: EditContext): boolean {
    if (formatter instanceof TableEditFormatter) {
      switch (formatter.type) {
        case TableEditActions.AddColumnToLeft:
          formatter.addColumnToLeft(this.cellMatrix, this.left.columnIndex);
          break;
        case TableEditActions.AddColumnToRight:
          formatter.addColumnToRight(this.cellMatrix, this.right.columnIndex + this.right.columnToEndOffset - 1);
          break;
        case TableEditActions.AddRowToTop:
          formatter.addRowToTop(this.cellMatrix, this.top.rowIndex);
          break;
        case TableEditActions.AddRowToBottom:
          formatter.addRowToBottom();
          break;
        case TableEditActions.MergeCells:
          formatter.mergeCells();
          break;
        case TableEditActions.SplitCells:
          formatter.splitCells();
          break;
        case TableEditActions.DeleteTopRow:
          formatter.deleteTopRow();
          break;
        case TableEditActions.DeleteBottomRow:
          formatter.deleteBottomRow();
          break;
        case TableEditActions.DeleteLeftColumn:
          formatter.deleteLeftColumn();
          break;
        case TableEditActions.DeleteRightColumn:
          formatter.deleteRightColumn();
          break;
      }
      return false;
    }
    return true;
  }

  onOutput(head: HTMLHeadElement, body: HTMLBodyElement): void {
    const style = head.querySelector('#' + this.id);
    if (style) {
      style.parentNode.removeChild(style);
    }
  }

  onApplied(): void {
    this.cellMatrix = this.serialize(this.tableElement);
    this.setSelectedCellsAndUpdateMaskStyle(this.cellMatrix, this.startCell, this.endCell);
  }

  private setSelectedCellsAndUpdateMaskStyle(cellMatrix: RowPosition[],
                                             startCell: HTMLTableCellElement,
                                             endCell: HTMLTableCellElement) {
    const startPosition = this.findCellPosition(cellMatrix, startCell);
    const endPosition = this.findCellPosition(cellMatrix, endCell);

    const minColumnIndex = Math.min(startPosition.columnIndex, endPosition.columnIndex);
    const maxColumnIndex = Math.max(startPosition.columnIndex, endPosition.columnIndex);
    const minRowIndex = Math.min(startPosition.rowIndex, endPosition.rowIndex);
    const maxRowIndex = Math.max(startPosition.rowIndex, endPosition.rowIndex);
    const top = cellMatrix[minRowIndex].cells.slice(minColumnIndex, maxColumnIndex + 1).map(cell => {
      return {
        top: cell.cellElement.getBoundingClientRect().top,
        cell
      }
    }).sort((n, m) => {
      return n.top - m.top;
    }).shift();

    const left = cellMatrix.slice(minRowIndex, maxRowIndex + 1).map(row => {
      return {
        left: row.cells[minColumnIndex].cellElement.getBoundingClientRect().left,
        cell: row.cells[minColumnIndex]
      }
    }).sort((n, m) => {
      return n.left - m.left;
    }).shift();

    const right = cellMatrix.slice(minRowIndex, maxRowIndex + 1).map(row => {
      return {
        width: row.cells[maxColumnIndex].cellElement.getBoundingClientRect().right - left.left,
        cell: row.cells[maxColumnIndex]
      }
    }).sort((n, m) => {
      return n.width - m.width;
    }).pop();

    const bottom = cellMatrix[maxRowIndex].cells.slice(minColumnIndex, maxColumnIndex + 1).map(cell => {
      return {
        height: cell.cellElement.getBoundingClientRect().bottom - top.top,
        cell
      }
    }).sort((n, m) => {
      return n.height - m.height;
    }).pop();

    const startRect = this.startCell.getBoundingClientRect();
    this.firstMask.style.left = startRect.left - left.left + 'px';
    this.firstMask.style.top = startRect.top - top.top + 'px';
    this.firstMask.style.width = startRect.width + 'px';
    this.firstMask.style.height = startRect.height + 'px';

    this.mask.style.left = left.left + 'px';
    this.mask.style.top = top.top + 'px';
    this.mask.style.width = right.width + 'px';
    this.mask.style.height = bottom.height + 'px';

    const selectedCells = cellMatrix.slice(top.cell.rowIndex,
      bottom.cell.rowIndex + bottom.cell.rowToEndOffset).map(columns => {
      return columns.cells.slice(left.cell.columnIndex + left.cell.columnToEndOffset - left.cell.cellElement.colSpan,
        right.cell.columnIndex + right.cell.columnToEndOffset);
    }).reduce((a, b) => {
      return a.concat(b);
    }).map(item => item.cellElement);

    this.selectedCells = Array.from(new Set(selectedCells));
    this.left = left.cell;
    this.right = right.cell;
    this.top = top.cell;
    this.bottom = bottom.cell;
  }

  private findCellPosition(cellMatrix: RowPosition[],
                           cell: HTMLTableCellElement): { rowIndex: number, columnIndex: number } {
    let startRow: number;
    let startColumn: number;

    for (let rowIndex = 0; rowIndex < cellMatrix.length; rowIndex++) {
      const index = cellMatrix[rowIndex].cells.map(item => item.cellElement).indexOf(cell);
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

  private serialize(table: HTMLTableElement): RowPosition[] {
    const rows: RowPosition[] = [];

    function splitRows(rows: HTMLCollectionOf<HTMLTableRowElement>): RowPosition[] {
      return Array.from(rows).map(tr => {
        return {
          rowElement: tr,
          cells: Array.from(tr.cells).map(cell => {
            return {
              cellElement: cell,
              rowToEndOffset: cell.rowSpan,
              columnToEndOffset: cell.colSpan
            }
          })
        }
      });
    }

    if (table.tHead) {
      rows.push(...splitRows(table.tHead.rows));
    }

    if (table.tBodies) {
      Array.from(table.tBodies).forEach(tbody => {
        rows.push(...splitRows(tbody.rows));
      });
    }
    if (table.tFoot) {
      rows.push(...splitRows(table.tFoot.rows));
    }
    let stop = false;
    let columnIndex = 0;
    const marks: string[] = [];
    do {
      stop = rows.map((row, rowIndex) => {
        const cell = row.cells[columnIndex];
        if (cell) {
          let columnToEndOffset: number;
          let rowToEndOffset: number;
          let mark: string;

          cell.rowIndex = rowIndex;
          cell.columnIndex = columnIndex;

          if (cell.rowToEndOffset > 1) {
            columnToEndOffset = cell.columnToEndOffset;
            rowToEndOffset = cell.rowToEndOffset - 1;
            mark = `${rowIndex + 1}*${columnIndex}`;
            if (marks.indexOf(mark) === -1) {
              rows[rowIndex + 1].cells.splice(columnIndex, 0, {
                cellElement: cell.cellElement,
                columnToEndOffset,
                rowToEndOffset
              });
              marks.push(mark);
            }
          }
          if (cell.columnToEndOffset > 1) {
            columnToEndOffset = cell.columnToEndOffset - 1;
            rowToEndOffset = cell.rowToEndOffset;

            mark = `${rowIndex}*${columnIndex + 1}`;
            if (marks.indexOf(mark) === -1) {
              row.cells.splice(columnIndex + 1, 0, {
                cellElement: cell.cellElement,
                columnToEndOffset,
                rowToEndOffset
              });
              marks.push(mark);
            }
          }
          return true;
        }
        return false;
      }).indexOf(true) > -1;
      columnIndex++;
    } while (stop);

    return rows;
  }
}
