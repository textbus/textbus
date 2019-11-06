import { FormatRange } from './fragment';

export class VirtualNode {
  elementRef: Node;

  constructor(public formatRange: FormatRange,
              public parent: VirtualElementNode) {
  }
}

export class VirtualElementNode extends VirtualNode {
  children: Array<VirtualElementNode | VirtualNode> = [];
}
