import { Injector } from '@tanbo/di';

import { Commander, CommandContext } from '../../core/_api';
import { BlockComponent, BrComponent } from '../../components/_api';
import { RootComponent } from '../../root-component';

export class InsertParagraphCommander implements Commander<null> {
  recordHistory = true;
  private rootComponent: RootComponent

  constructor(private insertBefore: boolean) {
  }

  setup(injector: Injector) {
    this.rootComponent = injector.get(RootComponent);
  }

  command(c: CommandContext) {
    const {selection} = c;
    if (selection.rangeCount === 0) {
      this.recordHistory = false;
      return;
    }
    const firstRange = selection.firstRange;
    this.recordHistory = true;
    const component = selection.commonAncestorComponent;
    const parentFragment = component.parentFragment;
    const p = new BlockComponent('p');
    p.slot.append(new BrComponent());

    this.insertBefore ? parentFragment.insertBefore(p, component) : parentFragment.insertAfter(p, component);

    firstRange.setStart(p.slot, 0);
    firstRange.collapse();
  }
}
