import { MediaTemplate, TemplateTranslator, ViewData, VElement } from '../core/_api';

export class ImageTemplateTranslator implements TemplateTranslator {
  private tagName = 'img';

  match(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLImageElement): ViewData {
    return {
      template: new ImageTemplate(el.src),
      childrenSlots: []
    };
  }
}

export class ImageTemplate extends MediaTemplate {
  constructor(private src: string) {
    super('img');
  }

  render() {
    const el = new VElement(this.tagName);
    el.attrs.set('src', this.src);
    return el;
  }

  clone() {
    return new ImageTemplate(this.src);
  }
}
