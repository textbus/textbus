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
