import { LeafComponent, ComponentReader, ViewData, VElement } from '../core/_api';

export class ImageComponentReader implements ComponentReader {
  private tagName = 'img';

  match(component: HTMLElement): boolean {
    return component.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLImageElement): ViewData {
    return {
      component: new ImageComponent(el.src, {
        width: el.style.width || el.width + '',
        height: el.style.height || el.height +  ''
      }),
      childrenSlots: []
    };
  }
}

export class ImageComponent extends LeafComponent {
  width: string = null;
  height: string = null;

  constructor(public src: string, options = {
    width: '100%',
    height: 'auto'
  }) {
    super('img');
    this.width = options.width;
    this.height = options.height;
  }

  render() {
    const el = new VElement(this.tagName);
    el.attrs.set('src', this.src);
    if (this.width) {
      el.styles.set('width', this.width);
    }
    if (this.height) {
      el.styles.set('height', this.height);
    }
    return el;
  }

  clone(): ImageComponent {
    return new ImageComponent(this.src, {
      width: this.width,
      height: this.height
    });
  }
}
