import { ChildSlotsMap, Template } from '../core/template';
import { EditableFragment } from '../core/editable-fragment';

export class BlockTemplate implements Template {
  slots: EditableFragment[] = [];

  constructor(private tagName: string) {
  }

  is(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(template: HTMLElement): ChildSlotsMap[] {
    this.tagName = template.tagName;
    const slot = new EditableFragment();
    this.slots.push(slot);
    return [{
      from: template,
      inSlot: slot
    }];
  }
}
