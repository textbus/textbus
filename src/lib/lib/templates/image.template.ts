import { MediaTemplate, TemplateTranslator, ViewData } from '../core/template';
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

export class ImageTemplate extends MediaTemplate {
  constructor(tagName: string) {
    super(tagName);
  }

  render() {
    return new VElement(this.tagName);
  }

  clone() {
    return new ImageTemplate(this.tagName);
  }
}
