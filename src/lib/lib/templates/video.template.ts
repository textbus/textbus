import { LeafTemplate, TemplateTranslator, ViewData, VElement } from '../core/_api';

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

export class VideoTemplate extends LeafTemplate {
  width: string = null;
  height: string = null;
  constructor(public src: string, public autoplay: boolean, public controls: boolean) {
    super('video');

  }

  render() {
    const el = new VElement(this.tagName);
    el.attrs.set('src', this.src);
    el.attrs.set('autoplay', this.autoplay);
    el.attrs.set('controls', this.controls);
    if (this.width) {
      el.styles.set('width', this.width);
    }
    if (this.height) {
      el.styles.set('height', this.height);
    }
    return el;
  }

  clone() {
    return new VideoTemplate(this.src, this.autoplay, this.controls);
  }
}
