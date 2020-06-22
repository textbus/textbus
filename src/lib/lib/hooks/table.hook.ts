import { CubicBezier } from '@tanbo/bezier';
import { fromEvent, merge } from 'rxjs';

import { Commander, Fragment, Renderer, TBRange, TBSelection } from '../core/_api';
import { Lifecycle } from '../core/lifecycle';
import { CellPosition, RowPosition, TableEditCommander, TableSelectionRange } from '../toolbar/_api';
import { TableCell, TableTemplate } from '../templates/table.template';

interface ElementPosition {
  left: number;
  top: number;
  width: number;
  height: number;
}

function findElementByTagName(nodes: Node[], tagName: string | string[]): HTMLElement {
  if (!Array.isArray(tagName)) {
    tagName = [tagName];
  }
  const regs = tagName.map(tagName => new RegExp(`^${tagName}$`, 'i'));
  for (const node of nodes) {
    if (node.nodeType === 1 && regs.map(reg => reg.test((node as HTMLElement).tagName)).indexOf(true) > -1) {
      return node as HTMLElement;
    }
  }
  return null;
}

export class TableHook implements Lifecycle {
  private id = ('id' + Math.random()).replace(/\./, '');
  private mask = document.createElement('div');
  private firstMask = document.createElement('div');
  private selectedCells: HTMLTableCellElement[] = [];
  private startPosition: CellPosition;
  private endPosition: CellPosition;

  private tableElement: HTMLTableElement;
  private startCell: HTMLTableCellElement;
  private endCell: HTMLTableCellElement;
  private cellMatrix: RowPosition[] = [];
  private animateBezier = new CubicBezier(0.25, 0.1, 0.25, 0.1);
  private animateId: number;

  constructor() {
    this.mask.style.cssText = 'position: absolute; box-shadow: inset 0 0 0 2px #1296db; pointer-events: none; overflow: hidden';
    this.firstMask.style.cssText = 'position: absolute; box-shadow: 0 0 0 9999px rgba(18,150,219,.1); contain: style';
    this.mask.appendChild(this.firstMask);
  }

  setup(renderer: Renderer, contextDocument: Document, contextWindow: Window, frameContainer: HTMLElement) {

    const childBody = contextDocument.body;
    let insertMask = false;
    let insertStyle = false;
    let style = contextDocument.createElement('style');
    style.id = this.id;
    style.innerText = '::selection { background: transparent; }';

    merge(...[
      'scroll',
      'resize'
    ].map(type => fromEvent(contextWindow, type))).subscribe(() => {
      if (this.endCell) {
        this.setSelectedCellsAndUpdateMaskStyle(this.startCell, this.endCell, renderer);
      }
    });
    fromEvent(childBody, 'mousedown').subscribe(startEvent => {
      this.selectedCells = [];
      this.startPosition = null;
      this.endPosition = null;
      if (insertStyle) {
        contextDocument.getSelection().removeAllRanges();
        contextDocument.head.removeChild(style);
        insertStyle = false;
      }

      let startPaths: Node[] = [];
      if (startEvent.composedPath) {
        startPaths = startEvent.composedPath() as Node[];
      } else {
        let n = startEvent.target as Node;
        while (n) {
          startPaths.push(n);
          n = n.parentNode;
        }
      }
      this.startCell = this.endCell = findElementByTagName(startPaths, ['td', 'th']) as HTMLTableCellElement;
      this.tableElement = findElementByTagName(startPaths, 'table') as HTMLTableElement;
      if (!this.startCell || !this.tableElement) {
        if (insertMask) {
          insertMask = false;
          frameContainer.removeChild(this.mask);
        }
        return;
      }
      if (!insertMask) {
        frameContainer.appendChild(this.mask);
        insertMask = true;
        const initRect = this.startCell.getBoundingClientRect();
        this.mask.style.left = initRect.left + 'px';
        this.mask.style.top = initRect.top + 'px';
        this.mask.style.width = this.firstMask.style.width = initRect.width + 'px';
        this.mask.style.height = this.firstMask.style.height = initRect.height + 'px';
        this.firstMask.style.left = '0px';
        this.firstMask.style.top = '0px';
      }
      this.cellMatrix = this.serialize(renderer.getContext(renderer.getPositionByNode(this.startCell).fragment, TableTemplate));

      this.setSelectedCellsAndUpdateMaskStyle(this.startCell, this.endCell, renderer);

      const unBindMouseover = fromEvent(childBody, 'mouseover').subscribe(mouseoverEvent => {
        const paths = Array.from(mouseoverEvent.composedPath()) as Array<Node>;
        const currentTable = findElementByTagName(paths, 'table');
        if (currentTable !== this.tableElement) {
          return;
        }
        this.endCell = findElementByTagName(paths, ['td', 'th']) as HTMLTableCellElement || this.endCell;
        if (this.endCell) {
          if (this.endCell !== this.startCell) {
            contextDocument.head.appendChild(style);
            insertStyle = true;
          } else {
            if (insertStyle) {
              contextDocument.head.removeChild(style);
              insertStyle = false;
            }
          }
          this.setSelectedCellsAndUpdateMaskStyle(this.startCell, this.endCell, renderer);
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

  onSelectionChange(renderer: Renderer, selection: TBSelection, context: Document) {
    if (this.selectedCells.length) {
      if (this.selectedCells.length === 1) {
        return;
      }
      selection.removeAllRanges();
      this.selectedCells.map(cell => {
        const position = renderer.getPositionByNode(cell);
        const range = new TBRange(context.createRange(), renderer);
        range.setStart(position.fragment, position.startIndex);
        range.setEnd(position.fragment, position.endIndex);
        selection.addRange(range);
      });
    }
  }

  onApplyCommand(commander: Commander): boolean {
    if (commander instanceof TableEditCommander) {
      commander.updateValue({
        cellMatrix: this.cellMatrix,
        startPosition: this.startPosition,
        endPosition: this.endPosition
      });
    }
    return true;
  }

  private setSelectedCellsAndUpdateMaskStyle(cell1: HTMLTableCellElement,
                                             cell2: HTMLTableCellElement, renderer: Renderer) {
    const table = renderer.getContext(renderer.getPositionByNode(cell1).fragment, TableTemplate);


    const p1 = this.findCellPosition(cell1);
    const p2 = this.findCellPosition(cell2);
    const minRow = Math.min(p1.minRow, p2.minRow);
    const minColumn = Math.min(p1.minColumn, p2.minColumn);
    const maxRow = Math.max(p1.maxRow, p2.maxRow);
    const maxColumn = Math.max(p1.maxColumn, p2.maxColumn);
    const {startPosition, endPosition} = this.findSelectedRange(minRow, minColumn, maxRow, maxColumn);

    const startRect = startPosition.cellElement.getBoundingClientRect();
    const endRect = endPosition.cellElement.getBoundingClientRect();

    const firstCellRect = this.startCell.getBoundingClientRect();

    this.firstMask.style.width = firstCellRect.width + 'px';
    this.firstMask.style.height = firstCellRect.height + 'px';

    this.animate({
      left: this.mask.offsetLeft,
      top: this.mask.offsetTop,
      width: this.mask.offsetWidth,
      height: this.mask.offsetHeight
    }, {
      left: startRect.left,
      top: startRect.top,
      width: endRect.right - startRect.left,
      height: endRect.bottom - startRect.top
    }, {
      left: firstCellRect.left - startRect.left,
      top: firstCellRect.top - startRect.top,
      width: firstCellRect.width,
      height: firstCellRect.height
    });

    const selectedCells = this.cellMatrix.slice(startPosition.rowIndex, endPosition.rowIndex + 1).map(row => {
      return row.cellsPosition.slice(startPosition.columnIndex, endPosition.columnIndex + 1);
    }).reduce((a, b) => {
      return a.concat(b);
    }).map(item => renderer.getNativeNodeByVDom(table.getChildViewBySlot(item.cell.fragment)) as HTMLTableCellElement);

    this.selectedCells = Array.from(new Set(selectedCells));
    this.startPosition = startPosition;
    this.endPosition = endPosition;
  }

  private findCellPosition(cell: TableCell) {
    const cellMatrix = this.cellMatrix;
    let minRow: number, maxRow: number, minColumn: number, maxColumn: number;

    forA:for (let rowIndex = 0; rowIndex < cellMatrix.length; rowIndex++) {
      const cells = cellMatrix[rowIndex].cellsPosition;
      for (let colIndex = 0; colIndex < cells.length; colIndex++) {
        if (cells[colIndex].cell === cell) {
          minRow = rowIndex;
          minColumn = colIndex;
          break forA;
        }
      }
    }

    forB:for (let rowIndex = cellMatrix.length - 1; rowIndex > -1; rowIndex--) {
      const cells = cellMatrix[rowIndex].cellsPosition;
      for (let colIndex = cells.length - 1; colIndex > -1; colIndex--) {
        if (cells[colIndex].cell === cell) {
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

  private animate(start: ElementPosition, target: ElementPosition, firstCellPosition: ElementPosition) {
    cancelAnimationFrame(this.animateId);

    function toInt(n: number) {
      return n < 0 ? Math.ceil(n) : Math.floor(n);
    }

    let step = 0;
    const maxStep = 6;
    const animate = () => {
      step++;
      const ratio = this.animateBezier.update(step / maxStep);
      const left = start.left + toInt((target.left - start.left) * ratio);
      const top = start.top + toInt((target.top - start.top) * ratio);
      const width = start.width + toInt((target.width - start.width) * ratio);
      const height = start.height + toInt((target.height - start.height) * ratio);

      this.mask.style.left = left + 'px';
      this.mask.style.top = top + 'px';
      this.mask.style.width = width + 'px';
      this.mask.style.height = height + 'px';

      this.firstMask.style.left = target.left - left + firstCellPosition.left + 'px';
      this.firstMask.style.top = target.top - top + firstCellPosition.top + 'px';
      if (step < maxStep) {
        this.animateId = requestAnimationFrame(animate);
      }
    };
    this.animateId = requestAnimationFrame(animate);
  }

  private findSelectedRange(minRow: number, minColumn: number, maxRow: number, maxColumn: number): TableSelectionRange {
    const cellMatrix = this.cellMatrix;
    const x1 = -Math.max(...cellMatrix.slice(minRow, maxRow + 1).map(row => row.cellsPosition[minColumn].columnOffset));
    const x2 = Math.max(...cellMatrix.slice(minRow, maxRow + 1).map(row => {
      return row.cellsPosition[maxColumn].cell.colspan - (row.cellsPosition[maxColumn].columnOffset + 1);
    }));
    const y1 = -Math.max(...cellMatrix[minRow].cellsPosition.slice(minColumn, maxColumn + 1).map(cell => cell.rowOffset));
    const y2 = Math.max(...cellMatrix[maxRow].cellsPosition.slice(minColumn, maxColumn + 1).map(cell => {
      return cell.cell.rowspan - (cell.rowOffset + 1);
    }));

    if (x1 || y1 || x2 || y2) {
      return this.findSelectedRange(minRow + y1, minColumn + x1, maxRow + y2, maxColumn + x2);
    }

    return {
      startPosition: cellMatrix[minRow].cellsPosition[minColumn],
      endPosition: cellMatrix[maxRow].cellsPosition[maxColumn]
    }
  }

  private serialize(table: TableTemplate): RowPosition[] {
    const rows: RowPosition[] = [];

    const bodies = table.config.bodies;
    for (let i = 0; i < bodies.length; i++) {
      const cells: CellPosition[] = [];
      bodies[i].forEach((cell, index) => {
        cells.push({
          row: cells,
          beforeCell: bodies[i][index - 1],
          afterCell: bodies[i][index + 1],
          cell,
          rowOffset: 0,
          columnOffset: 0
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
      stop = rows.map((row, rowIndex) => {
        const cellPosition = row.cellsPosition[columnIndex];
        if (cellPosition) {
          let mark: string;
          cellPosition.rowIndex = rowIndex;
          cellPosition.columnIndex = columnIndex;

          if (cellPosition.columnOffset + 1 < cellPosition.cell.colspan) {
            mark = `${rowIndex}*${columnIndex + 1}`;
            if (marks.indexOf(mark) === -1) {
              row.cellsPosition.splice(columnIndex + 1, 0, {
                beforeCell: cellPosition.beforeCell,
                afterCell: cellPosition.afterCell,
                cell: cellPosition.cell,
                row: row.cellsPosition,
                columnOffset: cellPosition.columnOffset + 1,
                rowOffset: cellPosition.rowOffset
              });
              marks.push(mark);
            }
          }
          if (cellPosition.rowOffset + 1 < cellPosition.cell.rowspan) {
            mark = `${rowIndex + 1}*${columnIndex}`;
            if (marks.indexOf(mark) === -1) {
              const nextRow = rows[rowIndex + 1];
              const newRowBeforeColumn = nextRow.cellsPosition[columnIndex - 1];
              const newRowAfterColumn = nextRow.cellsPosition[columnIndex];
              nextRow.cellsPosition.splice(columnIndex, 0, {
                beforeCell: newRowBeforeColumn ? newRowBeforeColumn.cell : null,
                afterCell: newRowAfterColumn ? newRowAfterColumn.cell : null,
                row: rows[rowIndex + 1].cellsPosition,
                cell: cellPosition.cell,
                columnOffset: cellPosition.columnOffset,
                rowOffset: cellPosition.rowOffset + 1
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
