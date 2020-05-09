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

    const childNodes = Array.from(template.childNodes);
    while (childNodes.length) {
      const slot = new EditableFragment();
      this.slots.push(slot);
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
      childrenSlots
    };
  }

  render(abstractData: AbstractData): any {
  }
}
