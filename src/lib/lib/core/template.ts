import { Fragment } from './fragment';
import { VElement } from './element';

export interface SlotMap {
  from: HTMLElement;
  toSlot: Fragment;
}

export interface ViewData {
  template: Template | MediaTemplate;
  childrenSlots: SlotMap[];
}

export interface TemplateTranslator {
  match(template: HTMLElement): boolean;

  from(template: HTMLElement): ViewData;
}

export abstract class Template {
  readonly length = 1;
  readonly childSlots: Fragment[] = [];
  protected viewMap = new Map<Fragment, VElement>();

  protected constructor(public tagName: string) {
  }

  abstract render(isProduction: boolean): VElement;
  abstract clone(): Template & any;

  getChildViewBySlot(slot: Fragment) {
    return this.viewMap.get(slot);
  }
}

export abstract class MediaTemplate {
  readonly length = 1;

  protected constructor(public tagName: string) {
  }

  abstract render(isProduction: boolean): VElement;
  abstract clone(): MediaTemplate & any;
}
