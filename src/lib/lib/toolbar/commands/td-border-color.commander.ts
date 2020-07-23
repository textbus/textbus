import { Commander, FormatAbstractData, FormatEffect, Fragment, Renderer, TBSelection } from '../../core/_api';
import { TableEditRange } from './table-edit.commander';
import { TableComponent } from '../../components/table.component';
import { tdBorderColorFormatter } from '../../formatter/td-border-color.formatter';

export class TdBorderColorCommander implements Commander<string> {
  recordHistory = true;
  private color = '';
  private range: TableEditRange;

  updateValue(value: string) {
    this.color = value;
  }

  setEditRange(range: TableEditRange) {
    this.range = range;
  }

  command(selection: TBSelection, overlap: boolean, renderer: Renderer, rootFragment: Fragment) {
    this.recordHistory = true;
    const context = renderer.getContext(selection.firstRange.startFragment, TableComponent);
    if (!context) {
      this.recordHistory = false;
      return;
    }

    const cellMatrix = context.cellMatrix;
    const minRow = this.range.startPosition.rowIndex;
    const minColumn = this.range.startPosition.columnIndex;
    const maxRow = this.range.endPosition.rowIndex;
    const maxColumn = this.range.endPosition.columnIndex;

    const selectedCells = cellMatrix.slice(minRow, maxRow + 1)
      .map(row => row.cellsPosition.slice(minColumn, maxColumn + 1).filter(c => {
        return c.offsetRow === 0 && c.offsetColumn === 0;
      }))
      .reduce((p, n) => {
        return p.concat(n);
      });

    selectedCells.forEach(c => {
      if (this.color) {
        if (c.columnIndex === minColumn) {
          c.beforeCell?.fragment.apply(tdBorderColorFormatter, {
            state: FormatEffect.Valid,
            abstractData: new FormatAbstractData({
              styles: {
                name: 'borderRightColor',
                value: this.color
              }
            })
          })
        }
        if (c.rowIndex === minRow) {
          cellMatrix[minRow - 1]?.cellsPosition[c.columnIndex].cell.fragment.apply(tdBorderColorFormatter, {
            state: FormatEffect.Valid,
            abstractData: new FormatAbstractData({
              styles: {
                name: 'borderBottomColor',
                value: this.color
              }
            })
          })
        }
      }
      c.cell.fragment.apply(tdBorderColorFormatter, {
        state: FormatEffect.Invalid,
        abstractData: new FormatAbstractData()
      });
      c.cell.fragment.apply(tdBorderColorFormatter, {
        state: this.color ? FormatEffect.Valid : FormatEffect.Invalid,
        abstractData: new FormatAbstractData({
          styles: {
            name: 'borderColor',
            value: this.color
          }
        })
      })
    })
  }
}
