import { Commander } from './commander';
import { TBSelection } from '../viewer/selection';
import { FormatState } from '../matcher/matcher';
import { CacheData } from '../toolbar/utils/cache-data';
import { Handler } from '../toolbar/handlers/help';
import { VIRTUAL_NODE } from '../parser/help';
import { VNode } from '../renderer/virtual-dom';
import { Fragment } from '../parser/fragment';
import { Single } from '../parser/single';
import { BlockFormat } from '../parser/format';
import { Priority } from '../toolbar/help';
import { RootFragment } from '../parser/root-fragment';
import { Parser } from '../parser/parser';

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
  actionType: TableEditActions;
  private params: TableEditParams;

  updateValue(value: TableEditParams): void {
    this.params = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean, rootFragment: RootFragment): Fragment {
    switch (this.actionType) {
      case TableEditActions.AddColumnToLeft:
        this.addColumnToLeft(rootFragment.parser);
        break;
      case TableEditActions.AddColumnToRight:
        this.addColumnToRight(rootFragment.parser);
        break;
      case TableEditActions.AddRowToTop:
        this.addRowToTop(rootFragment.parser);
        break;
      case TableEditActions.AddRowToBottom:
        this.addRowToBottom(rootFragment.parser);
        break;
      case TableEditActions.MergeCells:
        this.mergeCells(selection, rootFragment.parser);
        break;
      case TableEditActions.SplitCells:
        this.splitCells(selection, rootFragment.parser);
        break;
      case TableEditActions.DeleteTopRow:
        this.deleteTopRow(rootFragment.parser);
        break;
      case TableEditActions.DeleteBottomRow:
        this.deleteBottomRow(rootFragment.parser);
        break;
      case TableEditActions.DeleteLeftColumn:
        this.deleteLeftColumn(rootFragment.parser);
        break;
      case TableEditActions.DeleteRightColumn:
        this.deleteRightColumn(rootFragment.parser);
        break;
    }
    let f = selection.commonAncestorFragment;
    while (f) {
      const isTr = f.getFormatRanges().filter(h => h.handler.priority === Priority.Default)
        .map(h => h.cacheData.tag)
        .includes('tr');
      if (isTr) {
        return f.parent;
      }
      f = f.parent;
    }
  }

  render(state: FormatState, rawElement?: HTMLElement, cacheData?: CacheData): null {
    return null;
  }

  private addColumnToLeft(parser: Parser) {
    const cellMatrix = this.params.cellMatrix;
    const index = this.params.startPosition.columnIndex;
    cellMatrix.forEach(row => {
      const cell = row.cells[index];
      const fragment = (cell.cellElement[VIRTUAL_NODE] as VNode).context;
      if (index === 0) {
        fragment.parent.insert(TableEditCommander.createCell('td', parser), 0);
      } else {
        if (cell.columnOffset === 0) {
          fragment.parent.insert(TableEditCommander.createCell('td', parser), fragment.getIndexInParent());
        } else if (cell.rowOffset === 0) {
          parser.getFormatStateByData(new CacheData({
            tag: 'td',
            attrs: {
              colspan: cell.cellElement.colSpan + 1,
              rowspan: cell.cellElement.rowSpan
            }
          })).forEach(item => {
            fragment.mergeFormat(new BlockFormat({
              ...item,
              context: fragment
            }))
          });
        }
      }
    });
    if (this.params.startPosition.cellElement === this.params.endPosition.cellElement) {
      this.params.startPosition.columnIndex++;
    } else {
      this.params.startPosition.columnIndex++;
      this.params.endPosition.columnIndex++;
    }
  }

  private addColumnToRight(parser: Parser) {
    const cellMatrix = this.params.cellMatrix;
    const index = this.params.endPosition.columnIndex;
    cellMatrix.forEach(row => {
      const cell = row.cells[index];
      const fragment = (cell.cellElement[VIRTUAL_NODE] as VNode).context;
      if (cell.columnOffset + 1 < cell.cellElement.colSpan) {
        if (cell.rowOffset === 0) {
          parser.getFormatStateByData(new CacheData({
            tag: 'td',
            attrs: {
              colspan: cell.cellElement.colSpan + 1,
              rowspan: cell.cellElement.rowSpan
            }
          })).forEach(item => {
            fragment.mergeFormat(new BlockFormat({
              ...item,
              context: fragment
            }))
          });
        }
      } else {
        const f = TableEditCommander.createCell('td', parser);
        fragment.parent.insert(f, fragment.getIndexInParent() + 1);
      }
    });
  }

  private addRowToTop(parser: Parser) {
    const cellMatrix = this.params.cellMatrix;
    const index = this.params.startPosition.rowIndex;

    const row = cellMatrix[index];
    const fragment = (row.rowElement[VIRTUAL_NODE] as VNode).context;
    const tr = new Fragment(parser.getFormatStateByData(new CacheData({
      tag: 'tr'
    })));
    if (index === 0) {
      cellMatrix[0].cells.forEach(() => {
        const td = TableEditCommander.createCell('td', parser);
        tr.append(td);
      });
    } else {
      row.cells.forEach(cell => {
        if (cell.rowOffset > 0) {
          if (cell.columnOffset === 0) {
            const cellFragment = (cell.cellElement[VIRTUAL_NODE] as VNode).context;
            parser.getFormatStateByData(new CacheData({
              tag: 'td',
              attrs: {
                rowspan: cell.cellElement.rowSpan + 1,
                colspan: cell.cellElement.colSpan
              }
            })).forEach(item => {
              cellFragment.mergeFormat(new BlockFormat({
                ...item,
                context: fragment
              }))
            });
          }
        } else {
          tr.append(TableEditCommander.createCell('td', parser));
        }
      });
    }
    fragment.parent.insert(tr, fragment.getIndexInParent());
    if (this.params.startPosition.cellElement === this.params.endPosition.cellElement) {
      this.params.startPosition.rowIndex++;
    } else {
      this.params.startPosition.rowIndex++;
      this.params.endPosition.rowIndex++;
    }
  }

  private addRowToBottom(parser: Parser) {
    const cellMatrix = this.params.cellMatrix;
    const index = this.params.endPosition.rowIndex;

    const row = cellMatrix[index];
    const fragment = (row.rowElement[VIRTUAL_NODE] as VNode).context;
    const tr = new Fragment(parser.getFormatStateByData(new CacheData({
      tag: 'tr'
    })));

    row.cells.forEach(cell => {
      if (cell.rowOffset < cell.cellElement.rowSpan - 1) {
        if (cell.columnOffset === 0) {
          const cellFragment = (cell.cellElement[VIRTUAL_NODE] as VNode).context;
          parser.getFormatStateByData(new CacheData({
            tag: 'td',
            attrs: {
              colspan: cell.cellElement.colSpan + 1,
              rowspan: cell.cellElement.rowSpan
            }
          })).forEach(item => {
            cellFragment.mergeFormat(new BlockFormat({
              ...item,
              context: fragment
            }))
          });
        }
      } else {
        tr.append(TableEditCommander.createCell('td', parser));
      }
    });
    fragment.parent.insert(tr, fragment.getIndexInParent() + 1);
  }

  private mergeCells(selection: TBSelection, parser: Parser) {
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
    const fragment = (newNode[VIRTUAL_NODE] as VNode).context;
    parser.getFormatStateByData(new CacheData({
      tag: 'td',
      attrs: {
        rowspan: maxRow - minRow + 1,
        colspan: maxColumn - minColumn + 1
      }
    })).forEach(item => {
      fragment.mergeFormat(new BlockFormat({
        ...item,
        context: fragment
      }))
    });
    selectedCells.forEach(cell => {
      const cellFragment = (cell[VIRTUAL_NODE] as VNode).context;
      const i = cellFragment.getIndexInParent();
      cellFragment.parent.delete(i, i + 1);
    });

    const range = selection.firstRange;
    selection.removeAllRanges();
    range.startFragment = range.endFragment = fragment;
    range.startIndex = 0;
    range.endIndex = fragment.contentLength;
    selection.addRange(range);
  }

  private splitCells(selection: TBSelection, parser: Parser) {
    const cellMatrix = this.params.cellMatrix;
    const minRow = this.params.startPosition.rowIndex;
    const minColumn = this.params.startPosition.columnIndex;
    const maxRow = this.params.endPosition.rowIndex;
    const maxColumn = this.params.endPosition.columnIndex;

    const fragments = cellMatrix.slice(minRow, maxRow + 1)
      .map(row => row.cells.slice(minColumn, maxColumn + 1))
      .reduce((p, c) => {
        return p.concat(c);
      }, []).map(cell => {
        const fragment = (cell.cellElement[VIRTUAL_NODE] as VNode).context;
        if (cell.rowOffset !== 0 || cell.columnOffset !== 0) {
          const rowFragment = (cell.rowElement[VIRTUAL_NODE] as VNode).context;
          parser.getFormatStateByData(new CacheData({
            tag: 'td'
          })).forEach(item => {
            fragment.mergeFormat(new BlockFormat({
              ...item,
              context: fragment
            }))
          });

          const newCellFragment = TableEditCommander.createCell('td', parser);

          if (cell.afterCell) {
            const index = (cell.afterCell[VIRTUAL_NODE] as VNode).context.getIndexInParent();
            rowFragment.insert(newCellFragment, index);
          } else {
            rowFragment.insert(newCellFragment, rowFragment.contentLength);
          }
          return newCellFragment;
        }
        return fragment;
      });

    const firstRange = selection.firstRange;
    selection.removeAllRanges();
    fragments.forEach(f => {
      const range = firstRange.clone();
      range.startIndex = 0;
      range.endIndex = f.contentLength;
      range.startFragment = range.endFragment = f;
      selection.addRange(range);
    });
  }

  private deleteTopRow(parser: Parser) {
    const cellMatrix = this.params.cellMatrix;
    const index = this.params.startPosition.rowIndex;

    if (index === 0) {
      return;
    }
    const prevRow = cellMatrix[index - 1];
    const prevRowFragment = (prevRow.rowElement[VIRTUAL_NODE] as VNode).context;
    prevRow.cells.forEach((cell, cellIndex) => {
      if (cell.columnOffset === 0) {
        if (cell.rowOffset === 0 && cell.cellElement.rowSpan > 1) {
          const rowFragment = (cell.rowElement[VIRTUAL_NODE] as VNode).context;
          const newCellFragment = TableEditCommander.createCell('td',
            parser,
            cell.cellElement.rowSpan - 1,
            cell.cellElement.colSpan);
          const newPosition = cellMatrix[index].cells[cellIndex];
          if (newPosition.afterCell) {
            const index = (newPosition.afterCell[VIRTUAL_NODE] as VNode).context.getIndexInParent();
            rowFragment.insert(newCellFragment, index);
          } else {
            rowFragment.insert(newCellFragment, rowFragment.contentLength);
          }
        } else {
          const cellFragment = (cell.cellElement[VIRTUAL_NODE] as VNode).context;
          parser.getFormatStateByData(new CacheData({
            tag: 'td',
            attrs: {
              rowspan: cell.cellElement.rowSpan - 1,
              colspan: cell.cellElement.colSpan
            }
          })).forEach(item => {
            cellFragment.mergeFormat(new BlockFormat({
              ...item,
              context: cellFragment
            }))
          });
        }
      }
    });
    const i = prevRowFragment.getIndexInParent();
    prevRowFragment.parent.delete(i, i + 1);
    if (this.params.startPosition.cellElement === this.params.endPosition.cellElement) {
      this.params.startPosition.rowIndex--;
    } else {
      this.params.startPosition.rowIndex--;
      this.params.endPosition.rowIndex--;
    }
  }

  private deleteBottomRow(parser: Parser) {
    const cellMatrix = this.params.cellMatrix;
    const index = this.params.endPosition.rowIndex;
    if (index === cellMatrix.length - 1) {
      return;
    }
    const nextRow = cellMatrix[index + 1];
    const nextRowFragment = (nextRow.rowElement[VIRTUAL_NODE] as VNode).context;
    nextRow.cells.forEach((cell, cellIndex) => {
      if (cell.columnOffset === 0) {
        if (cell.rowOffset > 0) {
          const cellFragment = (cell.cellElement[VIRTUAL_NODE] as VNode).context;
          parser.getFormatStateByData(new CacheData({
            tag: 'td',
            attrs: {
              rowspan: cell.cellElement.rowSpan - 1,
              colspan: cell.cellElement.colSpan
            }
          })).forEach(item => {
            cellFragment.mergeFormat(new BlockFormat({
              ...item,
              context: cellFragment
            }))
          });
        } else if (cell.rowOffset === 0) {
          if (cell.cellElement.rowSpan > 1) {

            const newPosition = cellMatrix[index + 2].cells[cellIndex];
            const rowFragment = (newPosition.rowElement[VIRTUAL_NODE] as VNode).context;
            const newCellFragment = TableEditCommander.createCell('td',
              parser,
              cell.cellElement.rowSpan - 1,
              cell.cellElement.colSpan);

            if (newPosition.afterCell) {
              const index = (newPosition.afterCell[VIRTUAL_NODE] as VNode).context.getIndexInParent();
              rowFragment.insert(newCellFragment, index);
            } else {
              rowFragment.insert(newCellFragment, rowFragment.contentLength);
            }
          }
        }
      }
    });
    const i = nextRowFragment.getIndexInParent();
    nextRowFragment.parent.delete(i, i + 1);
  }

  private deleteLeftColumn(parser: Parser) {
    const cellMatrix = this.params.cellMatrix;
    const index = this.params.startPosition.columnIndex;

    if (index === 0) {
      return;
    }
    cellMatrix.forEach(row => {
      const cell = row.cells[index - 1];
      if (cell.rowOffset === 0) {
        if (cell.columnOffset > 0) {
          const cellFragment = (cell.cellElement[VIRTUAL_NODE] as VNode).context;
          parser.getFormatStateByData(new CacheData({
            tag: 'td',
            attrs: {
              colspan: cell.cellElement.colSpan - 1,
              rowspan: cell.cellElement.rowSpan
            }
          })).forEach(item => {
            cellFragment.mergeFormat(new BlockFormat({
              ...item,
              context: cellFragment
            }));
          })
        } else {
          const rowFragment = (cell.rowElement[VIRTUAL_NODE] as VNode).context;
          const index = (cell.cellElement[VIRTUAL_NODE] as VNode).context.getIndexInParent();
          if (cell.cellElement.colSpan > 1) {
            const newCellFragment = TableEditCommander.createCell('td', parser, cell.cellElement.rowSpan, cell.cellElement.colSpan - 1);
            rowFragment.delete(index, index + 1);
            rowFragment.insert(newCellFragment, index);
          } else {
            rowFragment.delete(index, index + 1);
          }
        }
      }
    });
    if (this.params.startPosition.cellElement === this.params.endPosition.cellElement) {
      this.params.startPosition.columnIndex--;
    } else {
      this.params.startPosition.columnIndex--;
      this.params.endPosition.columnIndex--;
    }
  }

  private deleteRightColumn(parser: Parser) {
    const cellMatrix = this.params.cellMatrix;
    const index = this.params.endPosition.columnIndex;
    if (index === cellMatrix[0].cells.length - 1) {
      return;
    }
    cellMatrix.forEach(row => {
      const cell = row.cells[index + 1];
      if (cell.rowOffset === 0) {
        if (cell.columnOffset > 0) {
          const cellFragment = (cell.cellElement[VIRTUAL_NODE] as VNode).context;
          parser.getFormatStateByData(new CacheData({
            tag: 'td',
            attrs: {
              colspan: cell.cellElement.colSpan - 1,
              rowspan: cell.cellElement.rowSpan
            }
          })).forEach(item => {
            cellFragment.mergeFormat(new BlockFormat({
              ...item,
              context: cellFragment
            }));
          });
        } else {
          const rowFragment = (cell.rowElement[VIRTUAL_NODE] as VNode).context;
          const index = (cell.cellElement[VIRTUAL_NODE] as VNode).context.getIndexInParent();
          if (cell.cellElement.colSpan > 1) {
            const newCellFragment = TableEditCommander.createCell('td', parser, cell.cellElement.rowSpan, cell.cellElement.colSpan - 1);
            rowFragment.delete(index, index + 1);
            rowFragment.insert(newCellFragment, index);
          } else {
            rowFragment.delete(index, index + 1);
          }
        }
      }
    });
  }

  private static createCell(tagName: string, parser: Parser, rowspan?: number, colspan?: number) {
    const attrs = new Map<string, string>();
    if (rowspan) {
      attrs.set('rowspan', rowspan + '');
    }
    if (colspan) {
      attrs.set('colspan', colspan + '');
    }
    const cell = new Fragment(parser.getFormatStateByData(new CacheData({
      tag: tagName,
      attrs
    })));
    cell.append(new Single('br', parser.getFormatStateByData(new CacheData({
      tag: 'br'
    }))));
    return cell;
  }
}
