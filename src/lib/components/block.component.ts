import {
  ComponentReader,
  ViewData,
  VElement,
  EventType,
  DivisionComponent, SlotRendererFn
} from '../core/_api';
import { breakingLine } from './utils/breaking-line';

export class BlockComponentReader implements ComponentReader {
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

export class BlockComponent extends DivisionComponent {
  constructor(tagName: string) {
    super(tagName);
    this.slot.events.subscribe(event => {
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
