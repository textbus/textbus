import { Fragment } from '../parser/fragment';
import { FormatRange } from '../parser/format';

export class VTextNode {
  constructor(public context: Fragment,
              public startIndex: number,
              public endIndex: number) {
  }
}

export class VBlockNode {
  children: Array<VNode> = [];
  constructor(public context: Fragment,
              public formats: FormatRange[]) {
  }
}

export class VInlineNode {
  children: Array<VNode> = [];
  constructor(public context: Fragment,
              public formats: FormatRange[],
              public startIndex: number,
              public endIndex: number) {
  }
}

export class VMediaNode {
  get endIndex() {
    return this.startIndex + 1;
  }

  constructor(public context: Fragment,
              public startIndex: number) {
  }
}

export type VNode = VTextNode | VBlockNode | VMediaNode | VInlineNode;


export class VirtualNode {
  elementRef: Node;

  constructor(public formats: FormatRange[],
              public context: Fragment,
              public startIndex: number,
              public endIndex: number) {
  }
}
