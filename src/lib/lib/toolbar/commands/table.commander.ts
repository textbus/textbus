import { BranchComponent, Commander, Fragment, Renderer, TBSelection } from '../../core/_api';
import { AttrState } from '../forms/help';
import { TableComponent, SingleTagComponent, TableCell } from '../../components/_api';

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
      const rows = +attrs.get('rows') || 0;
      const cols = +attrs.get('cols') || 0;
      const bodies = TableCommander.create(rows, cols);
      const table = new TableComponent({
        bodies
      });

      const parentTemplate = renderer.getParentTemplate(range.startFragment);
      const parentFragment = renderer.getParentFragment(parentTemplate);
      const firstContent = range.startFragment.getContentAtIndex(0);
      if (parentTemplate instanceof BranchComponent) {
        if (range.startFragment.contentLength === 0 ||
          range.startFragment.contentLength === 1 &&
          firstContent instanceof SingleTagComponent &&
          firstContent.tagName === 'br') {
          const i = parentFragment.indexOf(parentTemplate);
          parentFragment.insert(table, i);
          parentFragment.remove(i + 1, 1);
        } else {
          parentFragment.insertAfter(table, parentTemplate);
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
        fragment.append(new SingleTagComponent('br'));
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
