import {
  ComponentReader,
  ViewData,
  VElement,
  EventType,
  BranchComponent
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

export class BlockComponent extends BranchComponent {
  constructor(tagName: string) {
    super(tagName);
  }

  clone() {
    const component = new BlockComponent(this.tagName);
    component.slot.from(this.slot.clone());
    return component;
  }

  render(isProduction: boolean) {
    const block = new VElement(this.tagName);
    !isProduction && block.events.subscribe(event => {
      if (event.type === EventType.onEnter) {
        const parent = event.renderer.getParentFragment(this);

        const component = new BlockComponent('p');
        const firstRange = event.selection.firstRange;
        const next = breakingLine(firstRange.startFragment, firstRange.startIndex);
        component.slot.from(next);
        parent.insert(component, parent.indexOf(this) + 1);
        const position = firstRange.findFirstPosition(component.slot);
        firstRange.startFragment = firstRange.endFragment = position.fragment;
        firstRange.startIndex = firstRange.endIndex = position.index;
        event.stopPropagation();
      }
    })
    return block;
  }
}
