import { LeafComponent, ComponentReader, ViewData, VElement } from '../core/_api';

export class BrComponentReader implements ComponentReader {
  match(component: HTMLElement): boolean {
    return component.nodeName.toLowerCase() === 'br';
  }

  from(el: HTMLElement): ViewData {
    const component = new BrComponent();
    return {
      component: component,
      childrenSlots: []
    };
  }
}

export class BrComponent extends LeafComponent {
  constructor() {
    super('br');
  }
  clone() {
    return new BrComponent();
  }

  render() {
    return new VElement(this.tagName);
  }
}
