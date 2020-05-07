import { SlotMap, TemplateTranslator, ViewData } from '../core/template';
import { EditableFragment } from '../core/editable-fragment';
import { AbstractData } from '../core/abstract-data';

export class ListTemplate implements TemplateTranslator {
  slots: EditableFragment[] = [];

  constructor(private tagName: string) {
  }

  is(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(template: HTMLElement): ViewData {
    const childrenSlots: SlotMap[] = [];
    Array.from(template.childNodes).forEach(child => {
      const slot = new EditableFragment();
      this.slots.push(slot);
      if (child.nodeType === 1 && /^li$/i.test(child.nodeName)) {
        childrenSlots.push({
          from: child as HTMLElement,
          toSlot: slot
        })
      } else {
        const li = document.createElement('li');
        li.appendChild(child);
        childrenSlots.push({
          from: li,
          toSlot: slot
        })
      }
    });
    return {
      childrenSlots
    };
  }

  render(abstractData: AbstractData): any {
  }
}
