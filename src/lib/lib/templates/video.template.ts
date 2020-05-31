import { MediaTemplate, TemplateTranslator, ViewData, VElement } from '../core/_api';

export class VideoTemplateTranslator implements TemplateTranslator {
  private tagName = 'video';

  match(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLVideoElement): ViewData {
    return {
      template: new VideoTemplate(el.src, el.autoplay, el.controls),
      childrenSlots: []
    };
  }
}

export class VideoTemplate extends MediaTemplate {
  constructor(private src: string, private autoplay: boolean, private controls: boolean) {
    super('audio');

  }

  render() {
    const el = new VElement(this.tagName);
    el.attrs.set('src', this.src);
    el.attrs.set('autoplay', this.autoplay);
    el.attrs.set('controls', this.controls);
    return el;
  }

  clone() {
    return new VideoTemplate(this.src, this.autoplay, this.controls);
  }
}
