import { Fragment } from '../parser/fragment';
import { FormatRange } from '../parser/format';

export class VirtualNode {
  elementRef: Node;

  constructor(public formats: FormatRange[],
              public context: Fragment,
              public startIndex: number,
              public endIndex: number) {
  }
}

export class VirtualObjectNode extends VirtualNode {
}

export class VirtualContainerNode extends VirtualNode {
  children: Array<VirtualNode> = [];
}
