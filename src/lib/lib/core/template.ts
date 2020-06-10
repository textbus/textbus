import { Fragment } from './fragment';
import { VElement } from './element';

export interface SlotMap {
  from: HTMLElement;
  toSlot: Fragment;
}

export interface ViewData {
  template: BackboneTemplate | EndTemplate;
  childrenSlots: SlotMap[];
}

export interface TemplateTranslator {
  match(template: HTMLElement): boolean;

  from(template: HTMLElement): ViewData;
}

export abstract class Template {
  readonly length = 1;

  protected constructor(public tagName: string) {
  }

  abstract render(isProduction: boolean): VElement;

  abstract clone(): Template;
}

export abstract class SingleChildTemplate extends Template {
  slot: Fragment;
  vDom: VElement;
}

export abstract class BackboneTemplate extends Template {
  readonly childSlots: Fragment[] = [];
  protected viewMap = new Map<Fragment, VElement>();

  getChildViewBySlot(slot: Fragment) {
    return this.viewMap.get(slot);
  }
}

export abstract class EndTemplate extends Template {
}
