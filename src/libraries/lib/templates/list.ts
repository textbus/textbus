import { ChildSlotsMap, Template } from '../core/template';
import { EditableFragment } from '../core/editable-fragment';

export class ListTemplate implements Template {
  slots: EditableFragment[] = [];

  constructor(private tagName: string) {
  }

  is(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(template: HTMLElement): ChildSlotsMap[] {
    const childSlotsMaps: ChildSlotsMap[] = [];
    Array.from(template.childNodes).forEach(child => {
      const slot = new EditableFragment();
      this.slots.push(slot);
      if (child.nodeType === 1 && /^li$/i.test(child.nodeName)) {
        childSlotsMaps.push({
          from: child as HTMLElement,
          inSlot: slot
        })
      } else {
        const li = document.createElement('li');
        li.appendChild(child);
        childSlotsMaps.push({
          from: li,
          inSlot: slot
        })
      }
    });
    return childSlotsMaps;
  }
}
