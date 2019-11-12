import { FormatRange } from './fragment';

export class VirtualNode {
  elementRef: Node;

  constructor(public formats: FormatRange[],
              public parent: VirtualContainerNode) {
  }
}

export class VirtualContainerNode extends VirtualNode {
  children: Array<VirtualContainerNode | VirtualNode> = [];
}
