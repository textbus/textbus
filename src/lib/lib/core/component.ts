import { Fragment } from './fragment';
import { VElement } from './element';

export interface SlotMap {
  from: HTMLElement;
  toSlot: Fragment;
}

export interface ViewData {
  component: Component;
  childrenSlots: SlotMap[];
}

export abstract class ComponentReader {
  abstract match(element: HTMLElement): boolean;

  abstract from(element: HTMLElement): ViewData;

  // readComponent(by: HTMLElement, example: VElementLiteral, slotMark: VElementLiteral): HTMLElement[] {
  //   return this.findChildSlot(by, example, slotMark, []);
  // }
  //
  // private findChildSlot(by: HTMLElement,
  //                       example: VElementLiteral,
  //                       slotMark: VElementLiteral,
  //                       childSlot: HTMLElement[]): HTMLElement[] {
  //   if (example !== slotMark && this.equal(by, example)) {
  //     for (let index = 0; index < example.childNodes.length; index++) {
  //       const child = example.childNodes[index];
  //       const childNode = by.childNodes[index];
  //       if (!childNode) {
  //         return false;
  //       }
  //       if (typeof child === 'string' && childNode.nodeType === 3) {
  //         return childNode.textContent === child;
  //       } else if (typeof child !== 'string' && childNode.nodeType === 1) {
  //         return this.findChildSlot(childNode as HTMLElement, child, slotMark, childSlot);
  //       }
  //     }
  //   }
  //   childSlot.push(by);
  //   return childSlot;
  // }
  //
  // private equal(left: HTMLElement, right: VElementLiteral) {
  //   const equalTagName = left.nodeName.toLowerCase() === right.tagName;
  //   const equalAttrs = Object.keys(right.attrs).map(key => {
  //     return right.attrs[key] === left.getAttribute(key)
  //   }).reduce((previousValue, currentValue) => previousValue && currentValue, true);
  //   const equalStyles = Object.keys(right.styles).map(key => {
  //     return right.styles[key] === left.getAttribute(key)
  //   }).reduce((previousValue, currentValue) => previousValue && currentValue, true);
  //   return equalTagName && equalAttrs && equalStyles;
  // }
}

export abstract class Component {
  readonly length = 1;

  protected constructor(public tagName: string) {
  }

  abstract render(isProduction: boolean): VElement;

  abstract clone(): Component;
}

export abstract class BranchComponent extends Component {
  readonly slot = new Fragment();
}

export abstract class BackboneComponent extends Component {
  childSlots: Fragment[] = [];

  protected viewMap = new Map<Fragment, VElement>();

  abstract canSplit(): boolean;

  getChildViewBySlot(slot: Fragment) {
    return this.viewMap.get(slot);
  }
}

export abstract class LeafComponent extends Component {
}
