import { EditableFragment } from './editable-fragment';
import { VElement } from './element';

export interface SlotMap {
  from: HTMLElement;
  toSlot: EditableFragment;
}

export interface ViewData {
  template: Template;
  childrenSlots: SlotMap[];
}

export interface TemplateTranslator {
  is(template: HTMLElement): boolean;

  from(template: HTMLElement): ViewData;
}

export abstract class Template {
  readonly length = 1;
  readonly childSlots: EditableFragment[] = [];
  readonly viewMap = new Map<EditableFragment, VElement>();

  abstract render(): VElement;

  getChildViewBySlot(slot: EditableFragment) {
    return this.viewMap.get(slot);
  }
}
