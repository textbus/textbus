import { LeafComponent, ComponentReader, ViewData, VElement } from '../core/_api';
import { fromEvent } from 'rxjs';
import { auditTime } from 'rxjs/operators';

export interface ImageOptions {
  width?: string;
  height?: string;
  margin?: string;
  float?: string;
}

const imageLoadingSrc = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg"><g style="transform: translate(50%, 50%)"><circle cx="0" cy="0" r="2" fill="none" stroke="#e9eaec" stroke-width="0.5"></circle><circle cx="0" cy="0" r="2" fill="none" stroke="#1296db" stroke-width="0.5" stroke-dasharray="1.5 100"><animateTransform attributeType="xml" attributeName="transform" type="rotateZ" from="0 0 0" to="360 0 0" dur="1s" repeatCount="indefinite"></animateTransform></circle></g></svg>')}`

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

  private loadedImages: string[] = [];

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

  render(isOutputModel: boolean) {
    const el = new VElement(this.tagName);
    if (isOutputModel || this.loadedImages.includes(this.src)) {
      el.attrs.set('src', this.src);
    } else {
      el.attrs.set('src', imageLoadingSrc);
      const shadowImage = new Image();
      const src = this.src;
      let nativeImage: HTMLImageElement;
      el.events.subscribe(ev => {
        nativeImage = ev.renderer.getNativeNodeByVDom(el) as HTMLImageElement;
      })

      const s = fromEvent(shadowImage, 'load').pipe(auditTime(300)).subscribe(() => {
        this.loadedImages.push(src);
        nativeImage.classList.add('tb-image-loaded');
        nativeImage.src = src;
        s.unsubscribe();
      })
      shadowImage.src = src;
    }
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
