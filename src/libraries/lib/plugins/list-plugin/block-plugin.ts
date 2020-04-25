import { Matcher, Template, EditableFragment, ChildSlotsMap, Plugin } from '../../core/_api';

export class BlockTemplate implements Template {
  private tagName: string;
  slots: EditableFragment[] = [];

  from(template: HTMLElement): ChildSlotsMap[] {
    this.tagName = template.tagName;
    const slot = new EditableFragment();
    const childSlotsMaps: ChildSlotsMap[] = [];
    template.childNodes.forEach(child => {
      childSlotsMaps.push({
        from: child,
        inSlot: slot
      })
    });
    this.slots.push(slot);
    return childSlotsMaps;
  }
}

export class BlockPlugin implements Plugin {
  matcher = new Matcher({
    tags: ['li']
  });

  getViewTemplate(): Template {
    return new BlockTemplate();
  }
}
