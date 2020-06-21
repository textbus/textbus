import { Commander, Fragment, Renderer, TBSelection } from '../../core/_api';
import { AttrState } from '../forms/help';
import { TableTemplate, SingleTagTemplate, TableCell } from '../../templates/_api';

export class TableCommander implements Commander<AttrState[]> {
  recordHistory = true;
  private attrs: AttrState[] = [];

  updateValue(value: AttrState[]) {
    this.attrs = value;
  }

  command(selection: TBSelection, overlap: boolean, renderer: Renderer): void {
    const attrs = new Map<string, string | number | boolean>();
    this.attrs.forEach(attr => {
      attrs.set(attr.name, attr.value);
    });
    selection.ranges.forEach(range => {
      const parentFragment = renderer.getParentFragmentByTemplate(range.commonAncestorTemplate);
      const index = parentFragment.indexOf(range.commonAncestorTemplate);
      const rows = +attrs.get('rows') || 0;
      const cols = +attrs.get('cols') || 0;
      const bodies = this.create(rows, cols);
      if (rows && cols) {
        range.setStart(bodies[0][0].fragment, 0);
        range.collapse();
      }
      const table = new TableTemplate({
        bodies
      });
      parentFragment.insert(table, index);
    })
  }

  private create(rows: number, columns: number) {
    const result: TableCell[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: TableCell[] = [];
      result.push(row);
      for (let j = 0; j < columns; j++) {
        const fragment = new Fragment();
        fragment.append(new SingleTagTemplate('br'));
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
