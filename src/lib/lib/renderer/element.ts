export class VElement {
  readonly childNodes: Array<VElement> = [];
  readonly attrs = new Map<string, string | number>();
  readonly styles = new Map<string, string | number>();

  constructor(public tagName: string) {
  }

  appendChild(newChild: VElement) {
    this.childNodes.push(newChild);
    return newChild;
  }
}

export interface VElement {
  readonly attrs: Map<string, string | number>;
  readonly styles: Map<string, string | number>;
  readonly childNodes: Array<VElement>;

  appendChild(newChild: VElement): VElement;
}
