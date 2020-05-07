import { TemplateTranslator, ViewData } from '../core/template';
import { EditableFragment } from '../core/editable-fragment';
import { AbstractData } from '../core/abstract-data';

export class BlockTemplate implements TemplateTranslator {
  slots: EditableFragment[] = [];

  constructor(private tagName: string) {
  }

  is(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(template: HTMLElement): ViewData {
    this.tagName = template.tagName;
    const slot = new EditableFragment();
    this.slots.push(slot);
    return {
      childrenSlots: [{
        from: template,
        toSlot: slot
      }]
    };
  }


  render(abstractData: AbstractData): any {
  }
}
