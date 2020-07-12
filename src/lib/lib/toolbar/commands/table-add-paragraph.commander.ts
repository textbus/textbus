import { Commander, TBSelection, Renderer } from '../../core/_api';
import { TableTemplate, BlockTemplate, SingleTagTemplate } from '../../templates/_api';

export class TableAddParagraphCommander implements Commander {
  recordHistory = true;

  command(selection: TBSelection, overlap: boolean, renderer: Renderer) {
    const firstRange = selection.firstRange;
    const context = renderer.getContext(firstRange.startFragment, TableTemplate);
    if (context) {
      const parentFragment = renderer.getParentFragment(context);
      const p = new BlockTemplate('p');
      p.slot.append(new SingleTagTemplate('br'));

      parentFragment.insertAfter(p, context);

      firstRange.setStart(p.slot, 0);
      firstRange.collapse();
    }
  }
}
