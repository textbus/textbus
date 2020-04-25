import { Matcher } from '../../core/matcher';
import { Plugin } from '../../core/help';
import { ChildSlotsMap, Slot, Template } from '../../core/template';

export class BlockTemplate implements Template {
  private tagName: string;
  slots: Slot[] = [];

  from(template: HTMLElement): ChildSlotsMap[] {
    this.tagName = template.tagName;
    const slot = new Slot();
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
