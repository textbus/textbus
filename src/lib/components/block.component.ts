import {
  ComponentReader,
  ViewData,
  VElement,
  EventType,
  DivisionComponent
} from '../core/_api';
import { breakingLine } from './utils/breaking-line';

export class BlockComponentReader implements ComponentReader {
  constructor(private tagNames: string[]) {
  }

  match(component: HTMLElement): boolean {
    return this.tagNames.includes(component.nodeName.toLowerCase());
  }

  from(el: HTMLElement): ViewData {
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

export class BlockComponent extends DivisionComponent {
  private v: VElement;
  constructor(tagName: string) {
    super(tagName);
  }

  getSlotView(): VElement {
    return this.v;
  }

  clone() {
    const component = new BlockComponent(this.tagName);
    component.slot.from(this.slot.clone());
    return component;
  }

  render(isOutputMode: boolean) {
    const block = new VElement(this.tagName);
    this.v = block;
    !isOutputMode && block.events.subscribe(event => {
      if (event.type === EventType.onEnter) {
        const parent = this.parentFragment;

        const component = new BlockComponent('p');
        const firstRange = event.selection.firstRange;
        const next = breakingLine(firstRange.startFragment, firstRange.startIndex);
        component.slot.from(next);
        parent.insertAfter(component, this);
        const position = firstRange.findFirstPosition(component.slot);
        firstRange.startFragment = firstRange.endFragment = position.fragment;
        firstRange.startIndex = firstRange.endIndex = position.index;
        event.stopPropagation();
      }
    })
    return block;
  }
}
