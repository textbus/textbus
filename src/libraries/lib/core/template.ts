import { EditableFragment } from './editable-fragment';

export interface ChildSlotsMap {
  from: Node;
  inSlot: EditableFragment;
}

export interface Template {
  slots: EditableFragment[];
  from(template: HTMLElement): ChildSlotsMap[];
}
