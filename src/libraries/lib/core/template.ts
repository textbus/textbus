export class Slot {
  data: Template;
}

export interface TemplateMap {
  read: Node;
  toSlot: Slot;
}

export interface Template {
  slots: Slot[];
  from(template: HTMLElement, toSlot: Slot): TemplateMap[];
}
