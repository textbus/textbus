import { Injectable } from '@tanbo/di';

import {
  SlotMap,
  BranchAbstractComponent,
  ComponentLoader,
  ViewData,
  Fragment,
  VElement,
  TBEvent, SlotRenderFn, Component, Interceptor, TBSelection, SingleSlotRenderFn,
  BrComponent, DynamicKeymap, KeymapAction
} from '../core/_api';
import { BlockComponent } from './block.component';
import { breakingLine } from './utils/breaking-line';

class ListComponentLoader implements ComponentLoader {

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

@Injectable()
class ListComponentDynamicKeymap implements DynamicKeymap<ListComponent> {
  constructor(private selection: TBSelection) {
  }

  provide(instance: ListComponent): KeymapAction[] {
    return [{
      keymap: {
        key: 'Tab'
      },
      action: () => {
        const firstRange = this.selection.firstRange;
        const startFragment = this.getFragmentsInList(instance, firstRange.startFragment);
        const endFragment = this.getFragmentsInList(instance, firstRange.endFragment);

        const startIndex = instance.slots.indexOf(startFragment);
        const endIndex = instance.slots.indexOf(endFragment);

        const childList = new ListComponent(instance.tagName);
        childList.slots.push(...instance.slots.splice(startIndex, endIndex - startIndex + 1));
        const newSlot = new Fragment();
        newSlot.append(childList);
        instance.slots.splice(startIndex, 0, newSlot);
      }
    }];
  }

  private getFragmentsInList(instance: ListComponent, fragment: Fragment): Fragment {
    if (instance.slots.includes(fragment)) {
      return fragment;
    }
    return this.getFragmentsInList(instance, fragment.parentComponent.parentFragment);
  }
}

@Injectable()
class ListComponentInterceptor implements Interceptor<ListComponent> {
  constructor(private selection: TBSelection) {
  }

  onEnter(event: TBEvent<ListComponent>) {
    event.stopPropagation();
    const slot = this.selection.commonAncestorFragment;
    const instance = event.instance;
    const firstRange = this.selection.firstRange;
    const index = instance.slots.indexOf(slot);
    if (slot === instance.slots[instance.slots.length - 1] && index !== 0) {
      const lastContent = slot.getContentAtIndex(slot.length - 1);
      if (slot.length === 0 ||
        slot.length === 1 && lastContent instanceof BrComponent) {
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
    firstRange.setPosition(next, 0);
  }
}

@Component({
  loader: new ListComponentLoader(['ul', 'ol']),
  providers: [{
    provide: Interceptor,
    useClass: ListComponentInterceptor
  }, {
    provide: DynamicKeymap,
    useClass: ListComponentDynamicKeymap
  }]
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

  slotRender(slot: Fragment, isOutputMode: boolean, slotRendererFn: SingleSlotRenderFn): VElement {
    const li = new VElement('li');
    return slotRendererFn(slot, li);
  }

  render(isOutputMode: boolean, slotRendererFn: SlotRenderFn) {
    return new VElement(this.tagName, {
      childNodes: this.slots.map(i => slotRendererFn(i))
    });
  }

  split(startIndex: number, endIndex: number) {
    return {
      before: this.slots.slice(0, startIndex),
      center: this.slots.slice(startIndex, endIndex),
      after: this.slots.slice(endIndex)
    }
  }
}
