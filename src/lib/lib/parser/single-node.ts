import { Attr } from './help';
import { ViewNode } from './view-node';

export class SingleNode extends ViewNode {
  constructor(private tagName: string, private attrs: Attr[] = []) {
    super();
  }

  render() {
    const dom = document.createElement(this.tagName);
    this.attrs.forEach(attr => {
      dom.setAttribute(attr.name, attr.value);
    });
    return dom;
  }
}
