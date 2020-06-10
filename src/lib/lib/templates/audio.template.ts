import { EndTemplate, TemplateTranslator, ViewData, VElement } from '../core/_api';

export class AudioTemplateTranslator implements TemplateTranslator {
  private tagName = 'audio';

  match(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLAudioElement): ViewData {
    return {
      template: new AudioTemplate(el.src, el.autoplay, el.controls),
      childrenSlots: []
    };
  }
}

export class AudioTemplate extends EndTemplate {

  constructor(public src: string, public autoplay: boolean, public controls: boolean) {
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
    return new AudioTemplate(this.src, this.autoplay, this.controls);
  }
}
