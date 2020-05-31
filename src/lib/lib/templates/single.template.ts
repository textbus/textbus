import { MediaTemplate, TemplateTranslator, ViewData, VElement } from '../core/_api';

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

export class SingleTemplate extends MediaTemplate {
  constructor(tagName: string) {
    super(tagName);
  }

  clone() {
    return new SingleTemplate(this.tagName);
  }

  render() {
    return new VElement(this.tagName);
  }
}
