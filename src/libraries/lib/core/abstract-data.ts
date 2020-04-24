export class Slot {
  data: AbstractData;
}

export interface TemplateMap {
  read: Node;
  toSlot: Slot;
}

export interface AbstractData {
  slots: Slot[];
  from(template: HTMLElement, toSlot: Slot): TemplateMap[];
}
