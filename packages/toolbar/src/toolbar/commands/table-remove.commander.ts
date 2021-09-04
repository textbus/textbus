import { Injector, Fragment, RootComponent } from '@textbus/core';
import { TableComponent } from '@textbus/components';

import { CommandContext, Commander } from '../commander';

export class TableRemoveCommander implements Commander<null> {
  recordHistory = true;
  private rootFragment: Fragment;

  setup(injector: Injector) {
    this.rootFragment = injector.get(RootComponent).slot;
  }

  command(c: CommandContext) {
    const {selection} = c;
    this.recordHistory = true;
    const firstRange = selection.firstRange;
    const context = firstRange.startFragment.getContext(TableComponent);
    if (context) {
      let position = firstRange.findFirstPosition(context.getSlotAtIndex(0));
      firstRange.setStart(position.fragment, position.index);
      firstRange.collapse();

      const p = firstRange.getPreviousPosition();
      const flag = p.fragment === position.fragment;

      const parentFragment = context.parentFragment;
      const index = parentFragment.indexOf(context);
      parentFragment.remove(index, index + 1);

      if (flag) {
        position = firstRange.findFirstPosition(this.rootFragment);
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
