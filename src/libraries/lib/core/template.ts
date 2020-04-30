import { EditableFragment } from './editable-fragment';

export interface ChildSlotsMap {
  from: HTMLElement;
  inSlot: EditableFragment;
}

export interface Template {
  slots: EditableFragment[];

  is(template: HTMLElement): boolean;

  from(template: HTMLElement): ChildSlotsMap[];
}
