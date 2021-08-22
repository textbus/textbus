import { Injector, BrComponent, RootComponent } from '@textbus/core';
import { BlockComponent } from '@textbus/components';

import { CommandContext, Commander } from '../commander';

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
    let component = selection.commonAncestorComponent;

    if (component === this.rootComponent) {
      const commonAncestorFragmentScope = firstRange.getCommonAncestorFragmentScope();
      component = this.insertBefore ?
        commonAncestorFragmentScope.startChildComponent :
        commonAncestorFragmentScope.endChildComponent;
    }

    const parentFragment = component.parentFragment;
    const p = new BlockComponent('p');
    p.slot.append(new BrComponent());

    this.insertBefore ? parentFragment.insertBefore(p, component) : parentFragment.insertAfter(p, component);

    selection.removeAllRanges();
    firstRange.setStart(p.slot, 0);
    firstRange.collapse();
    selection.addRange(firstRange);
  }
}
