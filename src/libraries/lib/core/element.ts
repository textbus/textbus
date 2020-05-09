export class VElement {
  readonly childNodes: Array<VElement | string> = [];
  readonly attrs = new Map<string, string | number>();
  readonly styles = new Map<string, string | number>();

  constructor(public tagName: string) {
  }

  appendChild(newChild: VElement | string) {
    this.childNodes.push(newChild);
    return newChild;
  }
}
