import { LeafComponent, ComponentReader, ViewData, VElement } from '../core/_api';

export class SingleTagComponentReader implements ComponentReader {
  constructor(private tagName: string) {
  }

  match(component: HTMLElement): boolean {
    return component.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLElement): ViewData {
    const component = new SingleTagComponent(this.tagName);
    return {
      component: component,
      childrenSlots: []
    };
  }
}

export class SingleTagComponent extends LeafComponent {
  constructor(tagName: string) {
    super(tagName);
  }

  clone() {
    return new SingleTagComponent(this.tagName);
  }

  render() {
    return new VElement(this.tagName);
  }
}
