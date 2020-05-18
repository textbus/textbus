import { Template, TemplateTranslator, ViewData } from '../core/template';
import { VElement } from '../core/element';

export class SingleTemplateTranslator implements TemplateTranslator {
  constructor(private tagName: string) {
  }

  match(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLElement): ViewData {
    const template = new SingleTemplate(this.tagName);
    return {
      template,
      childrenSlots: []
    };
  }
}

export class SingleTemplate extends Template {
  constructor(public readonly tagName: string) {
    super();
  }

  render() {
    return new VElement(this.tagName);
  }
}
