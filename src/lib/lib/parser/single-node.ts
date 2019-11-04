import { Sliceable } from './contents';
import { Attr } from './help';

export class SingleNode implements Sliceable {
  readonly length = 1;

  constructor(private tagName: string, private attrs: Attr[] = []) {
  }

  slice(startIndex: number, endIndex: number): Sliceable {
    return new SingleNode(this.tagName, this.attrs);
  }

  render() {
    const dom = document.createElement(this.tagName);
    this.attrs.forEach(attr => {
      dom.setAttribute(attr.name, attr.value);
    });
    return dom;
  }
}
