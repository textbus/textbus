import { Commander } from './commander';
import { TBSelection } from '../viewer/selection';
import { FormatState } from '../matcher/matcher';
import { CacheData } from '../toolbar/utils/cache-data';
import { Handler } from '../toolbar/handlers/help';
import { VIRTUAL_NODE } from '../parser/help';
import { VirtualNode } from '../parser/virtual-dom';
import { Fragment } from '../parser/fragment';
import { Single } from '../parser/single';
import { FormatRange } from '../parser/format';
import { defaultHandlersMap } from '../default-handlers';
import { TBRange } from '../viewer/range';

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

export interface TableSelectionRange {
  startPosition: CellPosition;
  endPosition: CellPosition;
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

export interface TableEditParams {
  cellMatrix: RowPosition[];
  startPosition: CellPosition;
  endPosition: CellPosition;
}

export class TableEditCommander implements Commander<TableEditParams> {
  recordHistory = true;
  params: TableEditParams;

  constructor(private type: TableEditActions) {
  }

  updateValue(value: TableEditParams): void {
    this.params = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
    let range: TBRange;
    switch (this.type) {
      case TableEditActions.AddColumnToLeft:
        this.addColumnToLeft();
        break;
      case TableEditActions.AddColumnToRight:
        this.addColumnToRight();
        break;
      case TableEditActions.AddRowToTop:
        this.addRowToTop();
        break;
      case TableEditActions.AddRowToBottom:
        this.addRowToBottom();
        break;
      case TableEditActions.MergeCells:
        const f = this.mergeCells();
        range = selection.firstRange;
        selection.removeAllRanges();
        range.startFragment = range.endFragment = f;
        range.startIndex = 0;
        range.endIndex = f.contents.length;
        selection.addRange(range);
        break;
      case TableEditActions.SplitCells:
        const fragments = this.splitCells();
        console.log(fragments)
        const firstRange = selection.firstRange;
        selection.removeAllRanges();

        fragments.forEach(f => {
          const range = firstRange.clone();
          range.startIndex = 0;
          range.endIndex = f.contents.length;
          range.startFragment = range.endFragment = f;
          selection.addRange(range);
        });
        break;
      case TableEditActions.DeleteTopRow:
        this.deleteTopRow();
        break;
      case TableEditActions.DeleteBottomRow:
        this.deleteBottomRow();
        break;
      case TableEditActions.DeleteLeftColumn:
        this.deleteLeftColumn();
        break;
      case TableEditActions.DeleteRightColumn:
        this.deleteRightColumn();
        break;
    }
  }

  render(state: FormatState, rawElement?: HTMLElement, cacheData?: CacheData): null {
    return null;
  }

  private addColumnToLeft() {
    const cellMatrix = this.params.cellMatrix;
    const index = this.params.startPosition.columnIndex;
    cellMatrix.forEach(row => {
      const cell = row.cells[index];
      const fragment = (cell.cellElement[VIRTUAL_NODE] as VirtualNode).context;
      if (index === 0) {
        fragment.parent.insert(TableEditCommander.createCell('td', fragment.parent), 0);
      } else {
        if (cell.columnOffset === 0) {
          fragment.parent.insert(TableEditCommander.createCell('td', fragment), fragment.getIndexInParent());
        } else if (cell.rowOffset === 0) {
          const formatRange = fragment.formatMatrix.get(defaultHandlersMap.get('td'))[0];
          formatRange.cacheData.attrs.set('colspan', cell.cellElement.colSpan + 1 + '');
        }
      }
    });
    this.params.startPosition.columnIndex++;
    this.params.endPosition.columnIndex++;
  }

  private addColumnToRight() {
    const cellMatrix = this.params.cellMatrix;
    const index = this.params.endPosition.columnIndex;
    cellMatrix.forEach(row => {
      const cell = row.cells[index];
      const fragment = (cell.cellElement[VIRTUAL_NODE] as VirtualNode).context;
      if (cell.columnOffset + 1 < cell.cellElement.colSpan) {
        if (cell.rowOffset === 0) {
          const formatRange = fragment.formatMatrix.get(defaultHandlersMap.get('td'))[0];
          formatRange.cacheData.attrs.set('colspan', cell.cellElement.colSpan + 1 + '');
        }
      } else {
        const f = TableEditCommander.createCell('td', fragment.parent);
        fragment.parent.insert(f, fragment.getIndexInParent() + 1);
      }
    });
  }

  private addRowToTop() {
    const cellMatrix = this.params.cellMatrix;
    const index = this.params.startPosition.rowIndex;

    const row = cellMatrix[index];
    const fragment = (row.rowElement[VIRTUAL_NODE] as VirtualNode).context;
    const tr = new Fragment(fragment.parent);
    if (index === 0) {
      cellMatrix[0].cells.forEach(() => {
        const td = TableEditCommander.createCell('td', tr);
        tr.append(new Fragment(td));
      });
    } else {
      row.cells.forEach(cell => {
        if (cell.rowOffset > 0) {
          if (cell.columnOffset === 0) {
            const formatRange = (cell.cellElement[VIRTUAL_NODE] as VirtualNode).context.formatMatrix.get(defaultHandlersMap.get('td'))[0];
            formatRange.cacheData.attrs.set('colspan', cell.cellElement.rowSpan + 1 + '');
          }
        } else {
          tr.append(TableEditCommander.createCell('td', tr));
        }
      });
    }
    tr.mergeFormat(new FormatRange({
      startIndex: 0,
      endIndex: tr.contents.length,
      state: FormatState.Valid,
      cacheData: {
        tag: 'tr'
      },
      context: tr,
      handler: defaultHandlersMap.get('tr')
    }));
    fragment.parent.insert(tr, fragment.getIndexInParent());
    this.params.startPosition.rowIndex++;
    this.params.endPosition.rowIndex++;
  }

  private addRowToBottom() {
    const cellMatrix = this.params.cellMatrix;
    const index = this.params.endPosition.rowIndex;

    const row = cellMatrix[index];
    const fragment = (row.rowElement[VIRTUAL_NODE] as VirtualNode).context;
    const tr = new Fragment(fragment.parent);

    row.cells.forEach(cell => {
      if (cell.rowOffset < cell.cellElement.rowSpan - 1) {
        if (cell.columnOffset === 0) {
          const formatRange = (cell.cellElement[VIRTUAL_NODE] as VirtualNode).context.formatMatrix.get(defaultHandlersMap.get('td'))[0];
          formatRange.cacheData.attrs.set('colspan', cell.cellElement.rowSpan + 1 + '');
        }
      } else {
        tr.append(TableEditCommander.createCell('td', tr));
      }
    });
    tr.mergeFormat(new FormatRange({
      startIndex: 0,
      endIndex: tr.contents.length,
      state: FormatState.Valid,
      cacheData: {
        tag: 'tr'
      },
      context: tr,
      handler: defaultHandlersMap.get('tr')
    }));
    fragment.parent.insert(tr, fragment.getIndexInParent() + 1);
  }

  private mergeCells() {
    const cellMatrix = this.params.cellMatrix;
    const minRow = this.params.startPosition.rowIndex;
    const minColumn = this.params.startPosition.columnIndex;
    const maxRow = this.params.endPosition.rowIndex;
    const maxColumn = this.params.endPosition.columnIndex;

    const cells = cellMatrix.slice(minRow, maxRow + 1)
      .map(row => row.cells.slice(minColumn, maxColumn + 1).map(cell => cell.cellElement))
      .reduce((p, n) => {
        return p.concat(n);
      });
    const selectedCells = Array.from(new Set(cells));
    const newNode = selectedCells.shift();
    const fragment = (newNode[VIRTUAL_NODE] as VirtualNode).context;
    const formatRange = fragment.formatMatrix.get(defaultHandlersMap.get('td'))[0];
    formatRange.cacheData.attrs.set('rowspan', maxRow - minRow + 1 + '');
    formatRange.cacheData.attrs.set('colspan', maxColumn - minColumn + 1 + '');
    selectedCells.forEach(cell => {
      const cellFragment = (cell[VIRTUAL_NODE] as VirtualNode).context;
      cellFragment.parent.delete(cellFragment.getIndexInParent(), 1);
    });
    return fragment;
  }

  private splitCells() {
    const cellMatrix = this.params.cellMatrix;
    const minRow = this.params.startPosition.rowIndex;
    const minColumn = this.params.startPosition.columnIndex;
    const maxRow = this.params.endPosition.rowIndex;
    const maxColumn = this.params.endPosition.columnIndex;

    return cellMatrix.slice(minRow, maxRow + 1)
      .map(row => row.cells.slice(minColumn, maxColumn + 1))
      .reduce((p, c) => {
        return p.concat(c);
      }, []).map(cell => {
        const fragment = (cell.cellElement[VIRTUAL_NODE] as VirtualNode).context;
        if (cell.rowOffset !== 0 || cell.columnOffset !== 0) {
          const rowFragment = (cell.rowElement[VIRTUAL_NODE] as VirtualNode).context;
          const formatRange = fragment.formatMatrix.get(defaultHandlersMap.get('td'))[0];
          formatRange.cacheData.attrs.delete('rowspan');
          formatRange.cacheData.attrs.delete('colspan');

          const newCellFragment = TableEditCommander.createCell(formatRange.cacheData.tag, rowFragment);

          if (cell.afterCell) {
            const index = (cell.afterCell[VIRTUAL_NODE] as VirtualNode).context.getIndexInParent();
            rowFragment.insert(newCellFragment, index);
          } else {
            rowFragment.insert(newCellFragment, rowFragment.contents.length);
          }
          return newCellFragment;
        }
        return fragment;
      });
  }

  private deleteTopRow() {
  }

  private deleteBottomRow() {
  }

  private deleteLeftColumn() {
  }

  private deleteRightColumn() {
  }

  private static createCell(tagName: string, parent: Fragment) {
    const cell = new Fragment(parent);
    cell.append(new Single(cell, 'br'));
    cell.mergeFormat(new FormatRange({
      state: FormatState.Valid,
      startIndex: 0,
      endIndex: 0,
      cacheData: {
        tag: tagName
      },
      context: cell,
      handler: defaultHandlersMap.get(tagName)
    }));
    return cell;
  }
}
