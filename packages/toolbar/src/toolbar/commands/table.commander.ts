import { DivisionAbstractComponent, BrComponent, Fragment } from '@textbus/core';
import { TableComponent, TableCell } from '@textbus/components';

import { CommandContext, Commander } from '../commander';

export class TableCommander implements Commander<Map<string, string | number | boolean>> {
  recordHistory = true;

  command(context: CommandContext, attrs: Map<string, string | number | boolean>): void {
    const {selection} = context;
    const rows = +attrs.get('rows') || 0;
    const cols = +attrs.get('cols') || 0;
    const useTextBusStyle = !!attrs.get('useTextBusStyle');

    if (rows === 0 || cols === 0) {
      this.recordHistory = false;
      return;
    }
    this.recordHistory = true;

    selection.ranges.forEach(range => {

      const bodies = TableCommander.create(rows, cols);
      const table = new TableComponent({
        useTextBusStyle,
        bodies
      });

      const parentComponent = range.startFragment.parentComponent;
      const parentFragment = parentComponent.parentFragment;
      const firstContent = range.startFragment.getContentAtIndex(0);
      if (parentComponent instanceof DivisionAbstractComponent) {
        if (range.startFragment.length === 0 ||
          range.startFragment.length === 1 &&
          firstContent instanceof BrComponent) {
          const i = parentFragment.indexOf(parentComponent);
          parentFragment.insert(table, i);
          parentFragment.remove(i + 1, i + 2);
        } else {
          parentFragment.insertAfter(table, parentComponent);
        }
      } else {
        range.startFragment.insert(table, range.startIndex);
      }
      if (rows && cols) {
        range.setStart(bodies[0][0].fragment, 0);
        range.collapse();
      }
    })
  }

  private static create(rows: number, columns: number) {
    const result: TableCell[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: TableCell[] = [];
      result.push(row);
      for (let j = 0; j < columns; j++) {
        const fragment = new Fragment();
        fragment.append(new BrComponent());
        row.push({
          rowspan: 1,
          colspan: 1,
          fragment
        });
      }
    }
    return result;
  }
}
