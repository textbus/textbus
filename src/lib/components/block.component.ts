import { Injector } from '@tanbo/di';

import {
  ComponentReader,
  ViewData,
  VElement,
  DivisionAbstractComponent, SlotRendererFn, Component, EditActionInterceptor, TBEvent, TBSelection
} from '../core/_api';
import { breakingLine } from './utils/breaking-line';

class BlockComponentReader implements ComponentReader {
  constructor(private tagNames: string[]) {
  }

  match(component: HTMLElement): boolean {
    return this.tagNames.includes(component.nodeName.toLowerCase());
  }

  read(el: HTMLElement): ViewData {
    const component = new BlockComponent(el.tagName.toLocaleLowerCase());
    return {
      component: component,
      slotsMap: [{
        from: el,
        toSlot: component.slot
      }]
    };
  }
}

class BlockComponentEditActionInterceptor implements EditActionInterceptor<BlockComponent> {
  private selection: TBSelection;

  setup(injector: Injector) {
    this.selection = injector.get(TBSelection);
  }

  onEnter(event: TBEvent<BlockComponent>) {
    const parent = event.instance.parentFragment;

    const component = new BlockComponent('p');
    const firstRange = this.selection.firstRange;
    const next = breakingLine(firstRange.startFragment, firstRange.startIndex);
    component.slot.from(next);
    parent.insertAfter(component, event.instance);
    const position = firstRange.findFirstPosition(component.slot);
    firstRange.startFragment = firstRange.endFragment = position.fragment;
    firstRange.startIndex = firstRange.endIndex = position.index;
    event.stopPropagation();
  }
}

@Component({
  reader: new BlockComponentReader('div,p,h1,h2,h3,h4,h5,h6,blockquote,nav,header,footer'.split(',')),
  editActionInterceptor: new BlockComponentEditActionInterceptor()
})
export class BlockComponent extends DivisionAbstractComponent {
  constructor(tagName: string) {
    super(tagName);
  }

  clone() {
    const component = new BlockComponent(this.tagName);
    component.slot.from(this.slot.clone());
    return component;
  }

  render(isOutputMode: boolean, slotRendererFn: SlotRendererFn) {
    const block = new VElement(this.tagName);
    return slotRendererFn(this.slot, block);
  }
}
