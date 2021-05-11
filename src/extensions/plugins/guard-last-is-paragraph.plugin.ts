import { Injectable } from '@tanbo/di';
import { Subscription } from 'rxjs';

import { TBPlugin } from '../../lib/plugin';
import { RootComponent } from '../../lib/root-component';
import { BlockComponent } from '../../lib/components/block.component';
import { BrComponent, TBSelection, Renderer, Fragment } from '../../lib/core/_api';

@Injectable()
export class GuardLastIsParagraphPlugin implements TBPlugin {
  private subs: Subscription[] = [];

  constructor(private rootComponent: RootComponent,
              private renderer: Renderer,
              private selection: TBSelection) {
  }

  setup() {
    const rootComponent = this.rootComponent;
    const selection = this.selection;
    this.subs.push(this.renderer.onRendingBefore.subscribe(() => {
      const isEmpty = rootComponent.slot.length === 0;
      this.guardLastIsParagraph(rootComponent.slot);
      if (isEmpty && selection.firstRange) {
        const position = selection.firstRange.findFirstPosition(rootComponent.slot);
        selection.firstRange.setStart(position.fragment, position.index);
        selection.firstRange.setEnd(position.fragment, position.index);
      }
    }))
  }

  onDestroy() {
    this.subs.forEach(i => i.unsubscribe());
  }

  private guardLastIsParagraph(fragment: Fragment) {
    const last = fragment.sliceContents(fragment.length - 1)[0];
    if (last instanceof BlockComponent) {
      return;
    }
    const p = new BlockComponent('p');
    p.slot.append(new BrComponent());
    fragment.append(p);
  }
}
