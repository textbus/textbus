import {
  FormatData,
  FormatEffect,
} from '@textbus/core';
import { TableComponent } from '@textbus/components';
import { tdBorderColorFormatter } from '@textbus/formatters';

import { CommandContext, Commander } from '../commander';

export class TdBorderColorCommander implements Commander<string> {
  recordHistory = true;

  command(c: CommandContext, color: string) {
    const {selection} = c;
    this.recordHistory = true;
    const context = selection.firstRange.startFragment.getContext(TableComponent);
    if (!context) {
      this.recordHistory = false;
      return;
    }

    const range = context.selectCells(selection);

    const cellMatrix = context.cellMatrix;
    const minRow = range.startPosition.rowIndex;
    const minColumn = range.startPosition.columnIndex;
    const maxRow = range.endPosition.rowIndex;
    const maxColumn = range.endPosition.columnIndex;

    const selectedCells = cellMatrix.slice(minRow, maxRow + 1)
      .map(row => row.cellsPosition.slice(minColumn, maxColumn + 1).filter(c => {
        return c.offsetRow === 0 && c.offsetColumn === 0;
      }))
      .reduce((p, n) => {
        return p.concat(n);
      });

    selectedCells.forEach(c => {
      if (color) {
        if (c.columnIndex === minColumn) {
          const prev = c.beforeCell;
          if (prev) {
            const f = prev.fragment.getFormatRanges(tdBorderColorFormatter);
            if (f.length) {
              f.forEach(ff => {
                ff.formatData.styles.set('borderRightColor', color);
              })
            } else {
              prev.fragment.apply(tdBorderColorFormatter, {
                effect: FormatEffect.Valid,
                formatData: new FormatData({
                  styles: {
                    borderRightColor: color
                  }
                })
              })
            }
          }
        }
        if (c.rowIndex === minRow) {
          const prev = cellMatrix[minRow - 1]?.cellsPosition[c.columnIndex].cell;
          if (prev) {
            const f = prev.fragment.getFormatRanges(tdBorderColorFormatter);

            if (f.length) {
              f.forEach(ff => {
                ff.formatData.styles.set('borderBottomColor', color);
              })
            } else {
              prev.fragment.apply(tdBorderColorFormatter, {
                effect: FormatEffect.Valid,
                formatData: new FormatData({
                  styles: {
                    borderBottomColor: color
                  }
                })
              })
            }
          }
        }
      }
      c.cell.fragment.apply(tdBorderColorFormatter, {
        effect: FormatEffect.Invalid,
        formatData: new FormatData()
      });
      c.cell.fragment.apply(tdBorderColorFormatter, {
        effect: color ? FormatEffect.Valid : FormatEffect.Invalid,
        formatData: new FormatData({
          styles: {
            borderColor: color
          }
        })
      })
    })
  }
}
