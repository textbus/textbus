import { Plugin } from '../../core/help';
import { Matcher } from '../../core/matcher';
import { AbstractData, Slot, TemplateMap } from '../../core/abstract-data';

export class ListAbstractData implements AbstractData {
  private tagName: string;
  slots: Slot[] = [];

  from(template: HTMLElement, toSlot: Slot): TemplateMap[] {
    toSlot.data = this;
    this.tagName = template.tagName;
    const templateMap: TemplateMap[] = [];
    template.childNodes.forEach(child => {
      const slot = new Slot();
      this.slots.push(slot);
      if (child.nodeType === 1 && child.nodeName === 'li') {
        child.childNodes.forEach(c => {
          templateMap.push({
            read: c,
            toSlot: slot
          });
        })
      } else if (child.nodeType === 3) {
        templateMap.push({
          read: child,
          toSlot: slot
        });
      }
    });
    return templateMap;
  }
}

export class ListPlugin implements Plugin {
  matcher = new Matcher({
    tags: ['ul', 'ol']
  });
  abstractData = new ListAbstractData();
}
