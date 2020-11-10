import { Commander, CommandContext } from '../../core/_api';
import { TableComponent, BlockComponent, BrComponent } from '../../components/_api';

export class TableAddParagraphCommander implements Commander<null> {
  recordHistory = true;

  command(c: CommandContext) {
    const {selection} = c;
    this.recordHistory = true;
    const firstRange = selection.firstRange;
    const context = firstRange.startFragment.getContext(TableComponent);
    if (context) {
      const parentFragment = context.parentFragment;
      const p = new BlockComponent('p');
      p.slot.append(new BrComponent());

      parentFragment.insertAfter(p, context);

      firstRange.setStart(p.slot, 0);
      firstRange.collapse();
    } else {
      this.recordHistory = false;
    }
  }
}
