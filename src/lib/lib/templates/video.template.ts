import { Template, TemplateTranslator, ViewData } from '../core/template';
import { VElement } from '../core/element';

export class VideoTemplateTranslator implements TemplateTranslator {
  private tagName = 'video';

  match(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLElement): ViewData {
    return {
      template: new VideoTemplate(this.tagName),
      childrenSlots: []
    };
  }
}

export class VideoTemplate extends Template {
  constructor(public readonly tagName: string) {
    super();
  }

  render() {
    return new VElement(this.tagName);
  }
}
