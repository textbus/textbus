import { Injectable } from '@tanbo/di';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { TBPlugin } from '../../lib/plugin';
import { RootComponent } from '../../lib/root-component';
import { Fragment } from '../../lib/core/fragment';
import { BlockComponent } from '../../lib/components/block.component';
import { BrComponent } from '../../lib/core/component';
import { TBSelection } from '../../lib/core/selection';

@Injectable()
export class GuardLastIsParagraphPlugin implements TBPlugin {
  private subs: Subscription[] = [];

  constructor(private rootComponent: RootComponent,
              private selection: TBSelection) {
  }

  setup() {
    const rootComponent = this.rootComponent;
    const selection = this.selection;
    this.subs.push(rootComponent.onChange.pipe(debounceTime(10)).subscribe(() => {
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
