import { LeafComponent, ComponentReader, ViewData, VElement } from '../core/_api';

export class BrComponentReader implements ComponentReader {
  match(component: HTMLElement): boolean {
    return component.nodeName.toLowerCase() === 'br';
  }

  read(el: HTMLElement): ViewData {
    const component = new BrComponent();
    return {
      component: component,
      slotsMap: []
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
