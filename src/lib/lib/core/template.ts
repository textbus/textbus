import { Fragment } from './fragment';
import { VElement } from './element';

export interface SlotMap {
  from: HTMLElement;
  toSlot: Fragment;
}

export interface ViewData {
  template: Template;
  childrenSlots: SlotMap[];
}

export interface TemplateTranslator {
  match(element: HTMLElement): boolean;

  from(element: HTMLElement): ViewData;
}

export abstract class Template {
  readonly length = 1;

  protected constructor(public tagName: string) {
  }

  abstract render(isProduction: boolean): VElement;

  abstract clone(): Template;
}

export abstract class BranchTemplate extends Template {
  slot = new Fragment();
}

export abstract class BackboneTemplate extends Template {
  childSlots: Fragment[] = [];

  abstract get canSplit(): boolean;

  protected viewMap = new Map<Fragment, VElement>();

  getChildViewBySlot(slot: Fragment) {
    return this.viewMap.get(slot);
  }
}

export abstract class LeafTemplate extends Template {
}
