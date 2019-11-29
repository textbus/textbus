import { FormatRange, Fragment } from './fragment';

export class VirtualNode {
  elementRef: Node;

  constructor(public formats: FormatRange[],
              public context: Fragment,
              public parent: VirtualContainerNode,
              public startIndex: number,
              public endIndex: number) {
  }
}

export class VirtualObjectNode extends VirtualNode {
}

export class VirtualContainerNode extends VirtualNode {
  children: Array<VirtualNode> = [];
}
