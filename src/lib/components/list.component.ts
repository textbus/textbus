import {
  SlotMap,
  BranchComponent,
  ComponentReader,
  ViewData,
  Fragment,
  VElement,
  EventType
} from '../core/_api';
import { BrComponent } from './br.component';
import { BlockComponent } from './block.component';
import { breakingLine } from './utils/breaking-line';

export class ListComponentReader implements ComponentReader {

  constructor(private tagName: string) {
  }

  match(component: HTMLElement): boolean {
    return component.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLElement): ViewData {
    const component = new ListComponent(this.tagName);
    const childrenSlots: SlotMap[] = [];

    const childNodes = Array.from(el.childNodes);
    while (childNodes.length) {
      const slot = new Fragment();
      component.push(slot);
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

export class ListComponent extends BranchComponent {
  constructor(tagName: string) {
    super(tagName);
  }

  clone() {
    const component = new ListComponent(this.tagName);
    this.forEach(f => {
      component.push(f.clone());
    });
    return component;
  }

  render(isOutputMode: boolean) {
    const list = new VElement(this.tagName);
    this.viewMap.clear();
    this.forEach((slot, index) => {
      const li = new VElement('li');
      !isOutputMode && li.events.subscribe(event => {
        if (event.type === EventType.onEnter) {
          event.stopPropagation();

          const firstRange = event.selection.firstRange;
          if (slot === this.getSlotAtIndex(this.slotCount - 1)) {
            const lastContent = slot.getContentAtIndex(slot.contentLength - 1);
            if (slot.contentLength === 0 ||
              slot.contentLength === 1 && lastContent instanceof BrComponent) {
              this.pop();
              const parentFragment = this.parentFragment;
              const p = new BlockComponent('p');
              p.slot.from(new Fragment());
              p.slot.append(new BrComponent());
              parentFragment.insertAfter(p, this);
              firstRange.setStart(p.slot, 0);
              firstRange.collapse();
              return;
            }
          }

          const next = breakingLine(slot, firstRange.startIndex);

          this.splice(index + 1, 0, next);
          firstRange.startFragment = firstRange.endFragment = next;
          firstRange.startIndex = firstRange.endIndex = 0;
        }
      });
      list.appendChild(li);
      this.viewMap.set(slot, li);
    })
    return list;
  }

  split(startIndex: number, endIndex: number) {
    return {
      before: this.slice(0, startIndex),
      center: this.slice(startIndex, endIndex),
      after: this.slice(endIndex)
    }
  }
}
