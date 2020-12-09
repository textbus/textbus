import { LeafAbstractComponent, ComponentReader, ViewData, VElement, Component } from '../core/_api';

class BrComponentReader implements ComponentReader {
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
@Component({
  reader: new BrComponentReader()
})
export class BrComponent extends LeafAbstractComponent {
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
