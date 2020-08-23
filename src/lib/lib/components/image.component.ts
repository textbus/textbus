import { LeafComponent, ComponentReader, ViewData, VElement } from '../core/_api';

export interface ImageOptions {
  width?: string;
  height?: string;
  margin?: string;
  float?: string;
}

export class ImageComponentReader implements ComponentReader {
  private tagName = 'img';

  match(component: HTMLElement): boolean {
    return component.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLImageElement): ViewData {
    return {
      component: new ImageComponent(el.src, {
        width: el.style.width || el.width + '',
        height: el.style.height || el.height + '',
        margin: el.style.margin,
        float: el.style.float
      }),
      slotsMap: []
    };
  }
}

export class ImageComponent extends LeafComponent {
  width: string = null;
  height: string = null;
  float: string;
  margin: string;

  constructor(public src: string, options: ImageOptions = {
    width: '100%',
    height: 'auto',
  }) {
    super('img');
    this.width = options.width;
    this.height = options.height;
    this.float = options.float;
    this.margin = options.margin;
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
    if (['left', 'right'].includes(this.float)) {
      el.styles.set('float', this.float);
    }
    if (/[a-z]/i.test(this.margin)) {
      el.styles.set('margin', this.margin);
    }
    return el;
  }

  clone(): ImageComponent {
    return new ImageComponent(this.src, {
      width: this.width,
      height: this.height,
      float: this.float,
      margin: this.margin
    });
  }
}
