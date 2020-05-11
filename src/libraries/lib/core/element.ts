import { EventEmitter } from './events';

export class VElement {
  readonly events = new EventEmitter();
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
