import { SlotMap, Template, TemplateTranslator, ViewData } from '../core/template';
import { EditableFragment } from '../core/editable-fragment';
import { VElement } from '../core/element';

export class ListTemplateTranslator implements TemplateTranslator {

  constructor(private tagName: string) {
  }

  is(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLElement): ViewData {
    const template = new ListTemplate(this.tagName);
    const childrenSlots: SlotMap[] = [];

    const childNodes = Array.from(el.childNodes);
    while (childNodes.length) {
      const slot = new EditableFragment();
      template.childSlots.push(slot);
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
      template,
      childrenSlots
    };
  }
}

export class ListTemplate extends Template {
  constructor(private tagName: string) {
    super();
  }

  render() {
    const list = new VElement(this.tagName);
    this.childSlots.forEach(slot => {
      const li = new VElement('li');
      list.appendChild(li);
      this.viewMap.set(slot, li);
    })
    return list;
  }
}
