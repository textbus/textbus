import { ActionCommander, Fragment, Renderer, TBSelection } from '../../core/_api';
import { TableCellPosition, TableTemplate, SingleTagTemplate, TableCell } from '../../templates/_api';

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
  startPosition: TableCellPosition;
  endPosition: TableCellPosition;
}

export class TableEditCommander implements ActionCommander<TableEditParams> {
  recordHistory = true;
  private actionType: TableEditActions;
  private params: TableEditParams;

  setActionType(type: TableEditActions) {
    this.actionType = type;
  }

  updateValue(value: TableEditParams): void {
    this.params = value;
  }

  command(selection: TBSelection, overlap: boolean, renderer: Renderer) {
    const context = renderer.getContext(selection.firstRange.startFragment, TableTemplate);
    switch (this.actionType) {
      case TableEditActions.AddColumnToLeft:
        this.addColumnToLeft(context);
        break;
      case TableEditActions.AddColumnToRight:
        this.addColumnToRight(context);
        break;
      case TableEditActions.AddRowToTop:
        this.addRowToTop(context);
        break;
      case TableEditActions.AddRowToBottom:
        this.addRowToBottom(context);
        break;
      case TableEditActions.MergeCells:
        this.mergeCells(selection, context);
        break;
      case TableEditActions.SplitCells:
        this.splitCells(selection, context);
        break;
      case TableEditActions.DeleteTopRow:
        this.deleteTopRow(context);
        break;
      case TableEditActions.DeleteBottomRow:
        this.deleteBottomRow(context);
        break;
      case TableEditActions.DeleteLeftColumn:
        this.deleteLeftColumn(context);
        break;
      case TableEditActions.DeleteRightColumn:
        this.deleteRightColumn(context);
        break;
    }
  }

  private addColumnToLeft(context: TableTemplate) {
    const cellMatrix = context.cellMatrix;
    const index = this.params.startPosition.columnIndex;
    cellMatrix.forEach(row => {
      const cell = row.cellsPosition[index];
      if (index === 0) {
        cell.row.unshift(TableEditCommander.createCell());
      } else {
        if (cell.offsetColumn === 0) {
          cell.row.splice(cell.row.indexOf(cell.cell), 0, TableEditCommander.createCell());
        } else if (cell.offsetRow === 0) {
          cell.cell.colspan++;
        }
      }
    });
    if (this.params.startPosition.cell === this.params.endPosition.cell) {
      this.params.startPosition.columnIndex++;
    } else {
      this.params.startPosition.columnIndex++;
      this.params.endPosition.columnIndex++;
    }
  }

  private addColumnToRight(context: TableTemplate) {
    const cellMatrix = context.cellMatrix;
    const index = this.params.endPosition.columnIndex;
    cellMatrix.forEach(row => {
      const cell = row.cellsPosition[index];
      if (cell.offsetColumn + 1 < cell.cell.colspan) {
        if (cell.offsetRow === 0) {
          cell.cell.colspan++;
        }
      } else {
        cell.row.splice(cell.row.indexOf(cell.cell) + 1, 0, TableEditCommander.createCell());
      }
    });
  }

  private addRowToTop(context: TableTemplate) {
    const cellMatrix = context.cellMatrix;
    const index = this.params.startPosition.rowIndex;

    const row = cellMatrix[index];
    const tr: TableCell[] = [];
    if (index === 0) {
      cellMatrix[0].cells.forEach(() => {
        tr.push(TableEditCommander.createCell());
      });
    } else {
      row.cellsPosition.forEach(cell => {
        if (cell.offsetRow > 0) {
          if (cell.offsetColumn === 0) {
            cell.cell.rowspan++;
          }
        } else {
          tr.push(TableEditCommander.createCell());
        }
      });
    }
    context.config.bodies.splice(context.config.bodies.indexOf(row.cells), 0, tr);
    if (this.params.startPosition.cell === this.params.endPosition.cell) {
      this.params.startPosition.rowIndex++;
    } else {
      this.params.startPosition.rowIndex++;
      this.params.endPosition.rowIndex++;
    }
  }

  private addRowToBottom(context: TableTemplate) {
    const cellMatrix = context.cellMatrix;
    const index = this.params.endPosition.rowIndex;

    const row = cellMatrix[index];
    const tr: TableCell[] = [];

    row.cellsPosition.forEach(cell => {
      if (cell.offsetRow < cell.cell.rowspan - 1) {
        if (cell.offsetColumn === 0) {
          cell.cell.colspan++;
        }
      } else {
        tr.push(TableEditCommander.createCell());
      }
    });
    context.config.bodies.splice(context.config.bodies.indexOf(row.cells) + 1, 0, tr);
  }

  private mergeCells(selection: TBSelection, context: TableTemplate) {
    const cellMatrix = context.cellMatrix;
    const minRow = this.params.startPosition.rowIndex;
    const minColumn = this.params.startPosition.columnIndex;
    const maxRow = this.params.endPosition.rowIndex;
    const maxColumn = this.params.endPosition.columnIndex;

    const cells = cellMatrix.slice(minRow, maxRow + 1)
      .map(row => row.cellsPosition.slice(minColumn, maxColumn + 1))
      .reduce((p, n) => {
        return p.concat(n);
      });
    const selectedCells = Array.from(new Set(cells));
    const newNode = selectedCells.shift();
    newNode.cell.rowspan = maxRow - minRow + 1;
    newNode.cell.colspan = maxColumn - minColumn + 1;

    selectedCells.forEach(cell => {
      const index = cell.row.indexOf(cell.cell);
      if (index > -1) {
        cell.row.splice(index, 1);
        if (cell.row.length === 0) {
          context.config.bodies.splice(context.config.bodies.indexOf(cell.row), 1);
        }
      }
    });

    const range = selection.firstRange;
    selection.removeAllRanges();
    const fragment = newNode.cell.fragment;
    const startPosition = range.findFirstPosition(fragment);
    const endPosition = range.findLastChild(fragment);
    range.setStart(startPosition.fragment, startPosition.index);
    range.setEnd(endPosition.fragment, endPosition.index);
    selection.addRange(range);
    const {startCellPosition, endCellPosition} = context.selectCells(fragment, fragment);
    Object.assign(this.params.startPosition, startCellPosition);
    Object.assign(this.params.endPosition, endCellPosition);
  }

  private splitCells(selection: TBSelection, context: TableTemplate) {
    const cellMatrix = context.cellMatrix;
    const minRow = this.params.startPosition.rowIndex;
    const minColumn = this.params.startPosition.columnIndex;
    const maxRow = this.params.endPosition.rowIndex;
    const maxColumn = this.params.endPosition.columnIndex;

    const firstRange = selection.firstRange;
    cellMatrix.slice(minRow, maxRow + 1)
      .map(row => row.cellsPosition.slice(minColumn, maxColumn + 1))
      .reduce((p, c) => {
        return p.concat(c);
      }, []).forEach(cell => {
      if (cell.offsetRow !== 0 || cell.offsetColumn !== 0) {
        cell.cell.colspan = 1;
        cell.cell.rowspan = 1;
        const newCellFragment = TableEditCommander.createCell();

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
  }

  private deleteTopRow(context: TableTemplate) {
    const cellMatrix = context.cellMatrix;
    const index = this.params.startPosition.rowIndex;

    if (index === 0) {
      return;
    }
    const prevRow = cellMatrix[index - 1];
    prevRow.cellsPosition.forEach((cell, cellIndex) => {
      if (cell.offsetColumn === 0) {
        if (cell.offsetRow === 0 && cell.cell.rowspan > 1) {
          const newCellFragment = TableEditCommander.createCell(cell.cell.rowspan - 1,
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
    context.config.bodies.splice(context.config.bodies.indexOf(prevRow.cells), 1);
    if (this.params.startPosition.cell === this.params.endPosition.cell) {
      this.params.startPosition.rowIndex--;
    } else {
      this.params.startPosition.rowIndex--;
      this.params.endPosition.rowIndex--;
    }
  }

  private deleteBottomRow(context: TableTemplate) {
    const cellMatrix = context.cellMatrix;
    const index = this.params.endPosition.rowIndex;
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
            const newCellFragment = TableEditCommander.createCell(cell.cell.rowspan - 1,
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
    context.config.bodies.splice(context.config.bodies.indexOf(nextRow.cells), 1);
  }

  private deleteLeftColumn(context: TableTemplate) {
    const cellMatrix = context.cellMatrix;
    const index = this.params.startPosition.columnIndex;

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
            const newCellFragment = TableEditCommander.createCell(cell.cell.rowspan, cell.cell.colspan - 1);
            cell.row.splice(cell.row.indexOf(cell.cell), 1, newCellFragment);
          } else {
            cell.row.splice(index, 1);
          }
        }
      }
    });
    if (this.params.startPosition.cell === this.params.endPosition.cell) {
      this.params.startPosition.columnIndex--;
    } else {
      this.params.startPosition.columnIndex--;
      this.params.endPosition.columnIndex--;
    }
  }

  private deleteRightColumn(context: TableTemplate) {
    const cellMatrix = context.cellMatrix;
    const index = this.params.endPosition.columnIndex;
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
            const newCellFragment = TableEditCommander.createCell(cell.cell.rowspan, cell.cell.colspan - 1);
            cell.row.splice(index, 1, newCellFragment);
          } else {
            cell.row.splice(index, 1);
          }
        }
      }
    });
  }

  private static createCell(rowspan = 1, colspan = 1) {
    const fragment = new Fragment();
    fragment.append(new SingleTagTemplate('br'));
    return {
      rowspan,
      colspan,
      fragment
    };
  }
}
