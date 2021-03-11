import { Injectable } from '@tanbo/di';

import {
  Fragment,
  SlotMap,
  ComponentLoader,
  VElement,
  ViewData,
  BackboneAbstractComponent,
  SlotRenderFn,
  Component,
  Interceptor,
  TBSelection,
  TBEvent,
  SingleSlotRenderFn,
  ContextMenuAction,
  BrComponent
} from '../core/_api';

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
  // headers?: TableCell[][];
  useTextBusStyle: boolean;
  bodies: TableCell[][];
}

export interface TableCellRect {
  minRow: number;
  maxRow: number;
  minColumn: number;
  maxColumn: number;
}

export interface TableRange {
  startPosition: TableCellPosition;
  endPosition: TableCellPosition;
  selectedCells: Fragment[];
}

class TableComponentLoader implements ComponentLoader {
  private tagName = 'table';

  match(component: HTMLElement): boolean {
    return component.nodeName.toLowerCase() === this.tagName;
  }

  read(el: HTMLTableElement): ViewData {
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
    bodies.unshift(...headers);
    return {
      component: new TableComponent({
        // headers,
        useTextBusStyle: el.classList.contains('tb-table'),
        bodies
      }),
      slotsMap: slots
    };
  }
}

@Injectable()
class TableComponentInterceptor implements Interceptor<TableComponent> {
  constructor(private selection: TBSelection) {
  }

  onContextmenu(instance: TableComponent): ContextMenuAction[] {
    const selection = this.selection;
    return [{
      iconClasses: ['textbus-icon-table-add-column-left'],
      label: '在左边添加列',
      action() {
        instance.addColumnToLeft(selection);
      }
    }, {
      iconClasses: ['textbus-icon-table-add-column-right'],
      label: '在右边添加列',
      action() {
        instance.addColumnToRight(selection);
      }
    }, {
      iconClasses: ['textbus-icon-table-add-row-top'],
      label: '在上边添加行',
      action() {
        instance.addRowToTop(selection);
      }
    }, {
      iconClasses: ['textbus-icon-table-add-row-bottom'],
      label: '在下边添加行',
      action() {
        instance.addRowToBottom(selection);
      }
    }, {
      iconClasses: ['textbus-icon-table-delete-column-left'],
      label: '删除左边列',
      action() {
        instance.deleteLeftColumn(selection);
      }
    }, {
      iconClasses: ['textbus-icon-table-delete-column-right'],
      label: '删除右边列',
      action() {
        instance.deleteRightColumn(selection);
      }
    }, {
      iconClasses: ['textbus-icon-table-delete-row-top'],
      label: '删除上边行',
      action() {
        instance.deleteTopRow(selection);
      }
    }, {
      iconClasses: ['textbus-icon-table-delete-row-bottom'],
      label: '删除下边行',
      action() {
        instance.deleteBottomRow(selection);
      }
    }, {
      iconClasses: ['textbus-icon-table-split-columns'],
      label: '合并单元格',
      action() {
        instance.mergeCells(selection);
      }
    }, {
      iconClasses: ['textbus-icon-table'],
      label: '取消合并单元格',
      action() {
        instance.splitCells(selection);
      }
    }]
  }

  onEnter(event: TBEvent<TableComponent>) {
    const firstRange = this.selection.firstRange;
    const slot = this.selection.commonAncestorFragment;
    slot.insert(new BrComponent(), firstRange.startIndex);
    firstRange.startIndex = firstRange.endIndex = firstRange.startIndex + 1;
    const afterContent = slot.sliceContents(firstRange.startIndex, firstRange.startIndex + 1)[0];
    if (!afterContent) {
      slot.append(new BrComponent());
    }
    event.stopPropagation();
  }

  onDelete(event: TBEvent<TableComponent>) {
    if (this.selection.firstRange.startIndex === 0) {
      event.stopPropagation();
    }
  }
}

@Component({
  loader: new TableComponentLoader(),
  providers: [{
    provide: Interceptor,
    useClass: TableComponentInterceptor
  }],
  styles: [
    `td,th{border-width: 1px; border-style: solid;}
   table {border-spacing: 0; border-collapse: collapse; width: 100%; }
   .tb-table td, th {border-color: #aaa;}`
  ]
})
export class TableComponent extends BackboneAbstractComponent {
  get cellMatrix() {
    const n = this.serialize();
    this._cellMatrix = n;
    return n;
  }

  private _cellMatrix: TableRowPosition[];
  private deleteMarkFragments: Fragment[] = [];

  constructor(public config: TableInitParams) {
    super('table')
    const bodyConfig = config.bodies;
    const cells = [];
    for (const row of bodyConfig) {
      cells.push(...row.map(i => i.fragment));
    }
    this.push(...cells);
  }

  canDelete(deletedSlot: Fragment): boolean {
    this.deleteMarkFragments.push(deletedSlot);
    return !this.map(slot => this.deleteMarkFragments.includes(slot)).includes(false);
  }

  clone() {
    const clone = function (rows: TableCell[][]) {
      return rows.map(row => {
        return row.map(cell => {
          return {
            ...cell,
            fragment: cell.fragment.clone()
          };
        })
      });
    }

    const config: TableInitParams = {
      // headers: this.config.headers ? clone(this.config.headers) : null,
      useTextBusStyle: this.config.useTextBusStyle,
      bodies: clone(this.config.bodies)
    }
    return new TableComponent(config);
  }

  componentDataChange() {
    this.clean();
    this.config.bodies.forEach(row => {
      row.forEach(cell => {
        this.push(cell.fragment);
      })
    })
  }

  slotRender(slot: Fragment, isOutputMode: boolean, slotRendererFn: SingleSlotRenderFn): VElement {
    this.deleteMarkFragments = [];
    for (const row of this.config.bodies) {
      for (const col of row) {
        if (slot === col.fragment) {
          const td = TableComponent.renderingCell(col);
          return slotRendererFn(col.fragment, td);
        }
      }
    }
  }

  render(isOutputMode: boolean, slotRendererFn: SlotRenderFn) {
    const table = new VElement(this.tagName);
    if (this.config.useTextBusStyle) {
      table.classes.push('tb-table');
    }
    this.deleteMarkFragments = [];
    const bodyConfig = this.config.bodies;
    if (bodyConfig.length) {
      const body = new VElement('tbody');
      table.appendChild(body);
      for (const row of bodyConfig) {
        const tr = new VElement('tr');
        body.appendChild(tr);
        for (const col of row) {
          tr.appendChild(slotRendererFn(col.fragment));
        }
      }
    }
    return table;
  }

  selectCells(selection: TBSelection) {
    if (selection.rangeCount === 0) {
      return null;
    }
    const startFragment = this.findFragment(selection.firstRange.startFragment);
    if (!startFragment) {
      return null;
    }
    const endFragment = this.findFragment(selection.lastRange.endFragment);

    if (!endFragment) {
      return null;
    }
    return this.normalize(startFragment, endFragment);
  }

  addColumnToLeft(selection: TBSelection) {
    const selectRange = this.selectCells(selection);
    if (!selectRange) {
      return;
    }
    const cellMatrix = this.cellMatrix;
    const index = selectRange.startPosition.columnIndex;
    cellMatrix.forEach(row => {
      const cell = row.cellsPosition[index];
      if (index === 0) {
        cell.row.unshift(TableComponent.createCell());
      } else {
        if (cell.offsetColumn === 0) {
          cell.row.splice(cell.row.indexOf(cell.cell), 0, TableComponent.createCell());
        } else if (cell.offsetRow === 0) {
          cell.cell.colspan++;
        }
      }
    });
    if (selectRange.startPosition.cell === selectRange.endPosition.cell) {
      selectRange.startPosition.columnIndex++;
    } else {
      selectRange.startPosition.columnIndex++;
      selectRange.endPosition.columnIndex++;
    }
    this.markAsDirtied();
  }

  addColumnToRight(selection: TBSelection) {
    const selectRange = this.selectCells(selection);
    if (!selectRange) {
      return;
    }
    const cellMatrix = this.cellMatrix;
    const index = selectRange.endPosition.columnIndex;
    cellMatrix.forEach(row => {
      const cell = row.cellsPosition[index];
      if (cell.offsetColumn + 1 < cell.cell.colspan) {
        if (cell.offsetRow === 0) {
          cell.cell.colspan++;
        }
      } else {
        cell.row.splice(cell.row.indexOf(cell.cell) + 1, 0, TableComponent.createCell());
      }
    });
    this.markAsDirtied();
  }

  addRowToTop(selection: TBSelection) {
    const selectRange = this.selectCells(selection);
    if (!selectRange) {
      return;
    }
    const cellMatrix = this.cellMatrix;
    const index = selectRange.startPosition.rowIndex;

    const row = cellMatrix[index];
    const tr: TableCell[] = [];
    if (index === 0) {
      cellMatrix[0].cells.forEach(() => {
        tr.push(TableComponent.createCell());
      });
    } else {
      row.cellsPosition.forEach(cell => {
        if (cell.offsetRow > 0) {
          if (cell.offsetColumn === 0) {
            cell.cell.rowspan++;
          }
        } else {
          tr.push(TableComponent.createCell());
        }
      });
    }
    this.config.bodies.splice(this.config.bodies.indexOf(row.cells), 0, tr);
    if (selectRange.startPosition.cell === selectRange.endPosition.cell) {
      selectRange.startPosition.rowIndex++;
    } else {
      selectRange.startPosition.rowIndex++;
      selectRange.endPosition.rowIndex++;
    }
    this.markAsDirtied();
  }

  addRowToBottom(selection: TBSelection) {
    const selectRange = this.selectCells(selection);
    if (!selectRange) {
      return;
    }
    const cellMatrix = this.cellMatrix;
    const index = selectRange.endPosition.rowIndex;

    const row = cellMatrix[index];
    const tr: TableCell[] = [];

    row.cellsPosition.forEach(cell => {
      if (cell.offsetRow < cell.cell.rowspan - 1) {
        if (cell.offsetColumn === 0) {
          cell.cell.rowspan++;
        }
      } else {
        tr.push(TableComponent.createCell());
      }
    });
    this.config.bodies.splice(this.config.bodies.indexOf(row.cells) + 1, 0, tr);
    this.markAsDirtied();
  }

  mergeCells(selection: TBSelection) {
    const selectRange = this.selectCells(selection);
    if (!selectRange) {
      return;
    }
    const cellMatrix = this.cellMatrix;
    const minRow = selectRange.startPosition.rowIndex;
    const minColumn = selectRange.startPosition.columnIndex;
    const maxRow = selectRange.endPosition.rowIndex;
    const maxColumn = selectRange.endPosition.columnIndex;

    const selectedCells = cellMatrix.slice(minRow, maxRow + 1)
      .map(row => row.cellsPosition.slice(minColumn, maxColumn + 1).filter(c => {
        return c.offsetRow === 0 && c.offsetColumn === 0;
      }))
      .reduce((p, n) => {
        return p.concat(n);
      });
    const newNode = selectedCells.shift();
    newNode.cell.rowspan = maxRow - minRow + 1;
    newNode.cell.colspan = maxColumn - minColumn + 1;

    selectedCells.forEach(cell => {
      const index = cell.row.indexOf(cell.cell);
      if (index > -1) {
        cell.row.splice(index, 1);
        if (cell.row.length === 0) {
          this.config.bodies.splice(this.config.bodies.indexOf(cell.row), 1);
        }
      }
    });

    const range = selection.firstRange;
    selection.removeAllRanges();
    const fragment = newNode.cell.fragment;
    const start = range.findFirstPosition(fragment);
    const end = range.findLastChild(fragment);
    range.setStart(start.fragment, start.index);
    range.setEnd(end.fragment, end.index);
    selection.addRange(range);
    this.normalize(fragment, fragment);
    this.markAsDirtied();
  }

  splitCells(selection: TBSelection) {
    const selectRange = this.selectCells(selection);
    if (!selectRange) {
      return;
    }
    const cellMatrix = this.cellMatrix;
    const minRow = selectRange.startPosition.rowIndex;
    const minColumn = selectRange.startPosition.columnIndex;
    const maxRow = selectRange.endPosition.rowIndex;
    const maxColumn = selectRange.endPosition.columnIndex;

    const firstRange = selection.firstRange;
    cellMatrix.slice(minRow, maxRow + 1)
      .map(row => row.cellsPosition.slice(minColumn, maxColumn + 1))
      .reduce((p, c) => {
        return p.concat(c);
      }, []).forEach(cell => {
      if (cell.offsetRow !== 0 || cell.offsetColumn !== 0) {
        cell.cell.colspan = 1;
        cell.cell.rowspan = 1;
        const newCellFragment = TableComponent.createCell();

        if (!this.config.bodies.includes(cell.row)) {
          this.config.bodies.splice(cell.rowIndex, 0, cell.row);
        }

        if (cell.afterCell) {
          const index = cell.row.indexOf(cell.cell);
          cell.row.splice(index + 1, 0, newCellFragment);
        } else {
          cell.row.push(newCellFragment);
        }
        const range = firstRange.clone();
        range.startIndex = 0;
        range.endIndex = 1;
        range.startFragment = range.endFragment = newCellFragment.fragment;
        selection.addRange(range);
      }
    });
    this.markAsDirtied();
  }

  deleteTopRow(selection: TBSelection) {
    const selectRange = this.selectCells(selection);
    if (!selectRange) {
      return;
    }
    const cellMatrix = this.cellMatrix;
    const index = selectRange.startPosition.rowIndex;

    if (index === 0) {
      return;
    }
    const prevRow = cellMatrix[index - 1];
    prevRow.cellsPosition.forEach((cell, cellIndex) => {
      if (cell.offsetColumn === 0) {
        if (cell.offsetRow === 0 && cell.cell.rowspan > 1) {
          const newCellFragment = TableComponent.createCell(cell.cell.rowspan - 1,
            cell.cell.colspan);
          const newPosition = cellMatrix[index].cellsPosition[cellIndex];
          if (newPosition.afterCell) {
            const index = newPosition.row.indexOf(newPosition.afterCell);
            newPosition.row.splice(index, 0, newCellFragment);
          } else {
            newPosition.row.push(newCellFragment);
          }
        } else {
          cell.cell.rowspan--;
        }
      }
    });
    this.config.bodies.splice(this.config.bodies.indexOf(prevRow.cells), 1);
    if (selectRange.startPosition.cell === selectRange.endPosition.cell) {
      selectRange.startPosition.rowIndex--;
    } else {
      selectRange.startPosition.rowIndex--;
      selectRange.endPosition.rowIndex--;
    }
    this.markAsDirtied();
  }

  deleteBottomRow(selection: TBSelection) {
    const selectRange = this.selectCells(selection);
    if (!selectRange) {
      return;
    }
    const cellMatrix = this.cellMatrix;
    const index = selectRange.endPosition.rowIndex;
    if (index === cellMatrix.length - 1) {
      return;
    }
    const nextRow = cellMatrix[index + 1];
    nextRow.cellsPosition.forEach((cell, cellIndex) => {
      if (cell.offsetColumn === 0) {
        if (cell.offsetRow > 0) {
          cell.cell.rowspan--;
        } else if (cell.offsetRow === 0) {
          if (cell.cell.rowspan > 1) {

            const newPosition = cellMatrix[index + 2].cellsPosition[cellIndex];
            const newCellFragment = TableComponent.createCell(cell.cell.rowspan - 1,
              cell.cell.colspan);

            if (newPosition.afterCell) {
              newPosition.row.splice(newPosition.row.indexOf(newPosition.afterCell), 0, newCellFragment);
            } else {
              newPosition.row.push(newCellFragment);
            }
          }
        }
      }
    });
    this.config.bodies.splice(this.config.bodies.indexOf(nextRow.cells), 1);
    this.markAsDirtied();
  }

  deleteLeftColumn(selection: TBSelection) {
    const selectRange = this.selectCells(selection);
    if (!selectRange) {
      return;
    }
    const cellMatrix = this.cellMatrix;
    const index = selectRange.startPosition.columnIndex;

    if (index === 0) {
      return;
    }
    cellMatrix.forEach(row => {
      const cell = row.cellsPosition[index - 1];
      if (cell.offsetRow === 0) {
        if (cell.offsetColumn > 0) {
          cell.cell.colspan--;
        } else {
          const index = cell.row.indexOf(cell.cell);
          if (cell.cell.colspan > 1) {
            const newCellFragment = TableComponent.createCell(cell.cell.rowspan, cell.cell.colspan - 1);
            cell.row.splice(cell.row.indexOf(cell.cell), 1, newCellFragment);
          } else {
            cell.row.splice(index, 1);
          }
        }
      }
    });
    if (selectRange.startPosition.cell === selectRange.endPosition.cell) {
      selectRange.startPosition.columnIndex--;
    } else {
      selectRange.startPosition.columnIndex--;
      selectRange.endPosition.columnIndex--;
    }
    this.markAsDirtied();
  }

  deleteRightColumn(selection: TBSelection) {
    const selectRange = this.selectCells(selection);
    if (!selectRange) {
      return;
    }
    const cellMatrix = this.cellMatrix;
    const index = selectRange.endPosition.columnIndex;
    if (index === cellMatrix[0].cellsPosition.length - 1) {
      return;
    }
    cellMatrix.forEach(row => {
      const cell = row.cellsPosition[index + 1];
      if (cell.offsetRow === 0) {
        if (cell.offsetColumn > 0) {
          cell.cell.colspan--;
        } else {
          const index = cell.row.indexOf(cell.cell);
          if (cell.cell.colspan > 1) {
            const newCellFragment = TableComponent.createCell(cell.cell.rowspan, cell.cell.colspan - 1);
            cell.row.splice(index, 1, newCellFragment);
          } else {
            cell.row.splice(index, 1);
          }
        }
      }
    });
    this.markAsDirtied();
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
      startPosition: startCellPosition,
      endPosition: endCellPosition
    }
  }

  private findFragment(source: Fragment) {
    while (source) {
      if (this.indexOf(source) > -1) {
        return source;
      }
      source = source.parentComponent?.parentFragment;
    }
    return null;
  }

  private normalize(startCell: Fragment, endCell: Fragment) {
    this._cellMatrix = this.serialize();
    const p1 = this.findCellPosition(startCell);
    const p2 = this.findCellPosition(endCell);
    const minRow = Math.min(p1.minRow, p2.minRow);
    const minColumn = Math.min(p1.minColumn, p2.minColumn);
    const maxRow = Math.max(p1.maxRow, p2.maxRow);
    const maxColumn = Math.max(p1.maxColumn, p2.maxColumn);
    return this.selectCellsByRange(minRow, minColumn, maxRow, maxColumn);
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

  private static renderingCell(col: TableCell) {
    const td = new VElement('td');
    if (col.colspan > 1) {
      td.attrs.set('colspan', col.colspan);
    }
    if (col.rowspan > 1) {
      td.attrs.set('rowspan', col.rowspan);
    }
    if (col.fragment.length === 0) {
      col.fragment.append(new BrComponent());
    }
    return td;
  }

  private static createCell(rowspan = 1, colspan = 1) {
    const fragment = new Fragment();
    fragment.append(new BrComponent());
    return {
      rowspan,
      colspan,
      fragment
    };
  }
}
