import { Subscription } from 'rxjs';
import { Injectable, TBPlugin, RootComponent, BrComponent, TBSelection, Renderer, Fragment } from '@textbus/core';
import { BlockComponent } from '@textbus/components';

@Injectable()
export class GuardEndBlockPlugin implements TBPlugin {
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
    if (last instanceof BlockComponent && /^(h[1-6]|div|p)$/i.test(last.tagName)) {
      return;
    }
    const p = new BlockComponent('p');
    p.slot.append(new BrComponent());
    fragment.append(p);
  }
}
