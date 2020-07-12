import { LeafComponent, ComponentReader, ViewData, VElement } from '../core/_api';

export class SingleTagComponentReader implements ComponentReader {
  constructor(private tagName: string) {
  }

  match(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLElement): ViewData {
    const template = new SingleTagComponent(this.tagName);
    return {
      component: template,
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
