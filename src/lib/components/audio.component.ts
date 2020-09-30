import { LeafComponent, ComponentReader, ViewData, VElement } from '../core/_api';

export class AudioComponentReader implements ComponentReader {
  private tagName = 'audio';

  match(component: HTMLElement): boolean {
    return component.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLAudioElement): ViewData {
    return {
      component: new AudioComponent(el.src, el.autoplay, el.controls),
      slotsMap: []
    };
  }
}

export class AudioComponent extends LeafComponent {

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
    return new AudioComponent(this.src, this.autoplay, this.controls);
  }
}
