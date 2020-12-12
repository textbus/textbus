import { Injector } from '@tanbo/di';

import {
  SlotMap,
  BranchAbstractComponent,
  ComponentReader,
  ViewData,
  Fragment,
  VElement,
  TBEvent, SlotRendererFn, Component, EditActionInterceptor, TBSelection
} from '../core/_api';
import { BrComponent } from './br.component';
import { BlockComponent } from './block.component';
import { breakingLine } from './utils/breaking-line';

class ListComponentReader implements ComponentReader {

  constructor(private tagNames: string[]) {
  }

  match(component: HTMLElement): boolean {
    return this.tagNames.includes(component.nodeName.toLowerCase());
  }

  read(el: HTMLElement): ViewData {
    const component = new ListComponent(el.tagName.toLowerCase());
    const childrenSlots: SlotMap[] = [];

    const childNodes = Array.from(el.childNodes);
    while (childNodes.length) {
      const slot = new Fragment();
      component.slots.push(slot);
      let first = childNodes.shift();
      let newLi: HTMLElement;
      while (first) {
        if (/^li$/i.test(first.nodeName)) {
          childrenSlots.push({
            from: first as HTMLElement,
            toSlot: slot
          })
          break;
        }
        if (!newLi) {
          newLi = document.createElement('li');
        }
        newLi.appendChild(first);
        first = childNodes.shift();
      }
      if (newLi) {
        childrenSlots.push({
          from: newLi,
          toSlot: slot
        })
        newLi = null;
      }
    }
    return {
      component: component,
      slotsMap: childrenSlots
    };
  }
}

class ListComponentEditActionInterceptor implements EditActionInterceptor<ListComponent> {
  private selection: TBSelection;

  setup(injector: Injector) {
    this.selection = injector.get(TBSelection);
  }

  onEnter(event: TBEvent<ListComponent>) {
    event.stopPropagation();
    const slot = this.selection.commonAncestorFragment;
    const instance = event.instance;
    const firstRange = this.selection.firstRange;
    const index = instance.slots.indexOf(slot);
    if (slot === instance.slots[instance.slots.length - 1]) {
      const lastContent = slot.getContentAtIndex(slot.contentLength - 1);
      if (slot.contentLength === 0 ||
        slot.contentLength === 1 && lastContent instanceof BrComponent) {
        instance.slots.pop();
        const parentFragment = instance.parentFragment;
        const p = new BlockComponent('p');
        p.slot.from(new Fragment());
        p.slot.append(new BrComponent());
        parentFragment.insertAfter(p, instance);
        firstRange.setStart(p.slot, 0);
        firstRange.collapse();
        return;
      }
    }

    const next = breakingLine(slot, firstRange.startIndex);

    instance.slots.splice(index + 1, 0, next);
    firstRange.startFragment = firstRange.endFragment = next;
    firstRange.startIndex = firstRange.endIndex = 0;
  }
}

@Component({
  reader: new ListComponentReader(['ul', 'ol']),
  editActionInterceptor: new ListComponentEditActionInterceptor()
})
export class ListComponent extends BranchAbstractComponent {
  constructor(tagName: string) {
    super(tagName);
  }

  clone() {
    const component = new ListComponent(this.tagName);
    this.slots.forEach(f => {
      component.slots.push(f.clone());
    });
    return component;
  }

  render(isOutputMode: boolean, slotRendererFn: SlotRendererFn) {
    const list = new VElement(this.tagName);
    this.slots.forEach(slot => {
      const li = new VElement('li');
      list.appendChild(slotRendererFn(slot, li));
    })
    return list;
  }

  split(startIndex: number, endIndex: number) {
    return {
      before: this.slots.slice(0, startIndex),
      center: this.slots.slice(startIndex, endIndex),
      after: this.slots.slice(endIndex)
    }
  }
}
