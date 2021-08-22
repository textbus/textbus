import { LeafAbstractComponent, ComponentLoader, ViewData, VElement, Component } from '@textbus/core';

class AudioComponentLoader implements ComponentLoader {
  private tagName = 'audio';

  match(component: HTMLElement): boolean {
    return component.nodeName.toLowerCase() === this.tagName;
  }

  read(el: HTMLAudioElement): ViewData {
    return {
      component: new AudioComponent(el.src, el.autoplay, el.controls),
      slotsMap: []
    };
  }
}
@Component({
  loader: new AudioComponentLoader()
})
export class AudioComponent extends LeafAbstractComponent {
  block = false;

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
