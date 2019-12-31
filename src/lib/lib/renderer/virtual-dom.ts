import { Fragment } from '../parser/fragment';
import { FormatRange } from '../parser/format';

export class VTextNode {
  nativeElement: Node;

  get endIndex() {
    return this.startIndex + this.text.length;
  }

  constructor(public context: Fragment,
              public startIndex: number,
              public text: string) {
  }
}

export class VBlockNode {
  nativeElement: Node;
  readonly children: Array<VNode> = [];
  readonly startIndex = 0;

  get endIndex() {
    return this.context.length;
  }

  constructor(public context: Fragment,
              public formats: FormatRange[]) {
  }
}

export class VInlineNode {
  nativeElement: Node;
  readonly children: Array<VNode> = [];

  constructor(public context: Fragment,
              public formats: FormatRange[],
              public startIndex: number,
              public endIndex: number) {
  }
}

export class VMediaNode {
  nativeElement: Node;

  get endIndex() {
    return this.startIndex + 1;
  }

  constructor(public context: Fragment,
              public formats: FormatRange[],
              public startIndex: number) {
  }
}

export type VNode = VTextNode | VMediaNode | VInlineNode | VBlockNode;
