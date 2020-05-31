import { MediaTemplate, TemplateTranslator, ViewData, VElement } from '../core/_api';

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

export class VideoTemplate extends MediaTemplate {
  constructor(tagName: string) {
    super(tagName);
  }

  clone() {
    return new VideoTemplate(this.tagName);
  }

  render() {
    return new VElement(this.tagName);
  }
}
