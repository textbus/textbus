import { MediaTemplate, TemplateTranslator, ViewData } from '../core/template';
import { VElement } from '../core/element';
import { Constructor } from '@tanbo/tbus/core/renderer';

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

export class AudioTemplate extends MediaTemplate {
  constructor(tagName: string) {
    super(tagName);
  }

  render() {
    return new VElement(this.tagName);
  }

  clone() {
    return new AudioTemplate(this.tagName);
  }
}
