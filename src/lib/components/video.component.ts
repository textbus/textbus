import { LeafAbstractComponent, ComponentLoader, ViewData, VElement, Component } from '../core/_api';

class VideoComponentLoader implements ComponentLoader {
  private tagName = 'video';

  match(component: HTMLElement): boolean {
    return component.nodeName.toLowerCase() === this.tagName;
  }

  read(el: HTMLVideoElement): ViewData {
    return {
      component: new VideoComponent(el.src, el.autoplay, el.controls, {
        width: el.style.width || el.width + '',
        height: el.style.height || el.height + ''
      }),
      slotsMap: []
    };
  }
}
@Component({
  loader: new VideoComponentLoader()
})
export class VideoComponent extends LeafAbstractComponent {
  width: string = null;
  height: string = null;

  constructor(public src: string, public autoplay: boolean, public controls: boolean, option = {
    width: '100%',
    height: 'auto'
  }) {
    super('video');
    this.width = option.width;
    this.height = option.height;
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
    return new VideoComponent(this.src, this.autoplay, this.controls);
  }
}
