import { EndTemplate, TemplateTranslator, ViewData, VElement } from '../core/_api';

export class SingleTagTemplateTranslator implements TemplateTranslator {
  constructor(private tagName: string) {
  }

  match(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLElement): ViewData {
    const template = new SingleTagTemplate(this.tagName);
    return {
      template,
      childrenSlots: []
    };
  }
}

export class SingleTagTemplate extends EndTemplate {
  constructor(tagName: string) {
    super(tagName);
  }

  clone() {
    return new SingleTagTemplate(this.tagName);
  }

  render() {
    return new VElement(this.tagName);
  }
}
