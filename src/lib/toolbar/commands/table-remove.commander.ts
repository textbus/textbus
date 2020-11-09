import { Commander, CommandContext } from '../../core/_api';
import { TableComponent } from '../../components/_api';

export class TableRemoveCommander implements Commander<null> {
  recordHistory = true;

  command(c: CommandContext) {
    const {selection, renderer, rootFragment} = c;
    this.recordHistory = true;
    const firstRange = selection.firstRange;
    const context = renderer.getContext(firstRange.startFragment, TableComponent);
    if (context) {
      let position = firstRange.findFirstPosition(context.getSlotAtIndex(0));
      firstRange.setStart(position.fragment, position.index);
      firstRange.collapse();

      const p = firstRange.getPreviousPosition();
      const flag = p.fragment === position.fragment;

      const parentFragment = context.parentFragment;
      parentFragment.remove(parentFragment.indexOf(context), 1);

      if (flag) {
        position = firstRange.findFirstPosition(rootFragment);
      } else {
        position = p;
      }
      firstRange.setStart(position.fragment, position.index);
      firstRange.collapse();
    } else {
      this.recordHistory = false;
    }
  }
}
