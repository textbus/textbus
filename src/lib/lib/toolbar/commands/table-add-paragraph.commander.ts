import { Commander, TBSelection, Renderer } from '../../core/_api';
import { TableComponent, BlockComponent, BrComponent } from '../../components/_api';

export class TableAddParagraphCommander implements Commander {
  recordHistory = true;

  command(selection: TBSelection, overlap: boolean, renderer: Renderer) {
    const firstRange = selection.firstRange;
    const context = renderer.getContext(firstRange.startFragment, TableComponent);
    if (context) {
      const parentFragment = renderer.getParentFragment(context);
      const p = new BlockComponent('p');
      p.slot.append(new BrComponent());

      parentFragment.insertAfter(p, context);

      firstRange.setStart(p.slot, 0);
      firstRange.collapse();
    }
  }
}
