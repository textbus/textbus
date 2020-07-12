import {
  SlotMap,
  BackboneComponent,
  ComponentReader,
  ViewData,
  Fragment,
  VElement,
  EventType
} from '../core/_api';
import { SingleTagComponent } from './single-tag.component';
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
      component.childSlots.push(slot);
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
      childrenSlots
    };
  }
}

export class ListComponent extends BackboneComponent {
  constructor(tagName: string) {
    super(tagName);
  }

  clone() {
    const component = new ListComponent(this.tagName);
    this.childSlots.forEach(f => {
      component.childSlots.push(f.clone());
    });
    return component;
  }

  canSplit(): boolean {
    return true;
  }

  render(isProduction: boolean) {
    const list = new VElement(this.tagName);
    this.viewMap.clear();
    this.childSlots.forEach((slot, index) => {
      const li = new VElement('li');
      !isProduction && li.events.subscribe(event => {
        if (event.type === EventType.onEnter) {
          event.stopPropagation();

          const firstRange = event.selection.firstRange;
          if (slot === this.childSlots[this.childSlots.length - 1]) {
            const lastContent = slot.getContentAtIndex(slot.contentLength - 1);
            if (slot.contentLength === 0 ||
              slot.contentLength === 1 && lastContent instanceof SingleTagComponent && lastContent.tagName === 'br') {
              this.childSlots.pop();
              const parentFragment = event.renderer.getParentFragment(this);
              const p = new BlockComponent('p');
              p.slot.from(new Fragment());
              p.slot.append(new SingleTagComponent('br'));
              parentFragment.insertAfter(p, this);
              firstRange.setStart(p.slot, 0);
              firstRange.collapse();
              return;
            }
          }

          const next = breakingLine(slot, firstRange.startIndex);

          this.childSlots.splice(index + 1, 0, next);
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
      before: this.childSlots.slice(0, startIndex),
      center: this.childSlots.slice(startIndex, endIndex),
      after: this.childSlots.slice(endIndex)
    }
  }
}
