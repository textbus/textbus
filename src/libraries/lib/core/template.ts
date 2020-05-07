import { EditableFragment } from './editable-fragment';
import { AbstractData } from './abstract-data';
import { Renderer } from './renderer';

export interface SlotMap {
  from: HTMLElement;
  toSlot: EditableFragment;
}

export interface ViewData {
  abstractData?: AbstractData;
  childrenSlots: SlotMap[];
}

export interface TemplateTranslator extends Renderer {
  slots: EditableFragment[];

  is(template: HTMLElement): boolean;

  from(template: HTMLElement): ViewData;
}

export class Template {
  length = 1;

  constructor(public abstractData: AbstractData, public renderer: TemplateTranslator) {
  }
}
