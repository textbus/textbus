import { Template, TemplateTranslator, ViewData } from '../core/template';
import { VElement } from '../core/element';

export class AudioTemplateTranslator implements TemplateTranslator {
  private tagName = 'audio';

  match(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLElement): ViewData {
    return {
      template: new AudioTemplate(this.tagName),
      childrenSlots: []
    };
  }
}

export class AudioTemplate extends Template {
  constructor(public readonly tagName: string) {
    super();
  }

  render() {
    return new VElement(this.tagName);
  }
}
