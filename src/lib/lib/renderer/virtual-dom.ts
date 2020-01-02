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

  destroyView() {
    if (this.nativeElement && this.nativeElement.parentNode) {
      this.nativeElement.parentNode.removeChild(this.nativeElement);
    }
  }
}

export class VBlockNode {
  get nativeElement() {
    return this.slotElement;
  }

  slotElement: Node;
  wrapElement: Node;
  readonly children: Array<VNode> = [];
  readonly startIndex = 0;

  get endIndex() {
    return this.context.length;
  }

  constructor(public context: Fragment,
              public formats: FormatRange[]) {
  }


  destroyView() {
    if (this.wrapElement && this.wrapElement.parentNode) {
      this.wrapElement.parentNode.removeChild(this.wrapElement);
    }
  }
}

export class VInlineNode {
  get nativeElement() {
    return this.slotElement;
  }

  slotElement: Node;
  wrapElement: Node;
  readonly children: Array<VNode> = [];

  constructor(public context: Fragment,
              public formats: FormatRange[],
              public startIndex: number,
              public endIndex: number) {
  }

  destroyView() {
    if (this.wrapElement && this.wrapElement.parentNode) {
      this.wrapElement.parentNode.removeChild(this.wrapElement);
    }
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

  destroyView() {
    if (this.nativeElement && this.nativeElement.parentNode) {
      this.nativeElement.parentNode.removeChild(this.nativeElement);
    }
  }
}

export type VNode = VTextNode | VMediaNode | VInlineNode | VBlockNode;
