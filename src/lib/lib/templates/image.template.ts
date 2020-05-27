import { Template, TemplateTranslator, ViewData } from '../core/template';
import { VElement } from '../core/element';

export class ImageTemplateTranslator implements TemplateTranslator {
  private tagName = 'img';

  match(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLElement): ViewData {
    return {
      template: new ImageTemplate(this.tagName),
      childrenSlots: []
    };
  }
}

export class ImageTemplate extends Template {
  constructor(public readonly tagName: string) {
    super();
  }

  render() {
    return new VElement(this.tagName);
  }
}
