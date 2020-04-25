import { Contents } from './contents';

export class Slot {
  contents = new Contents();
}

export interface ChildSlotsMap {
  from: Node;
  inSlot: Slot;
}

export interface Template {
  slots: Slot[];
  from(template: HTMLElement): ChildSlotsMap[];
}
