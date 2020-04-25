import { Plugin, Template, EditableFragment, ChildSlotsMap, Matcher } from '../../core/_api';

export class ListTemplate implements Template {
  private tagName: string;
  slots: EditableFragment[] = [];

  from(template: HTMLElement): ChildSlotsMap[] {
    this.tagName = template.tagName;
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

export class ListPlugin implements Plugin {
  matcher = new Matcher({
    tags: ['ul', 'ol']
  });

  getViewTemplate(): Template {
    return new ListTemplate();
  }
}
