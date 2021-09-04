import { fromEvent } from 'rxjs';
import { auditTime } from 'rxjs/operators';

import { Component, ComponentLoader, LeafAbstractComponent, VElement, ViewData } from '@textbus/core';

export interface ImageOptions {
  maxWidth?: string;
  maxHeight?: string;
  width?: string;
  height?: string;
  margin?: string;
  float?: string;
}

const imageLoadingSrc = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg"><g style="transform: translate(50%, 50%)"><circle cx="0" cy="0" r="16px" fill="none" stroke="#e9eaec" stroke-width="4px"></circle><circle cx="0" cy="0" r="16px" fill="none" stroke="#1296db" stroke-width="4px" stroke-dasharray="20px 140px"><animateTransform attributeType="xml" attributeName="transform" type="rotateZ" from="0 0 0" to="360 0 0" dur="1s" repeatCount="indefinite"></animateTransform></circle></g></svg>')}`

class ImageComponentLoader implements ComponentLoader {
  private tagName = 'img';

  match(component: HTMLElement): boolean {
    return component.nodeName.toLowerCase() === this.tagName;
  }

  read(el: HTMLImageElement): ViewData {
    return {
      component: new ImageComponent(el.src, {
        width: el.style.width || (el.width === 0 ? null : el.width + ''),
        height: el.style.height || (el.height === 0 ? null : el.height + ''),
        maxWidth: el.style.maxWidth,
        maxHeight: el.style.maxHeight,
        margin: el.style.margin,
        float: el.style.float
      }),
      slotsMap: []
    };
  }
}
@Component({
  loader: new ImageComponentLoader()
})
export class ImageComponent extends LeafAbstractComponent {
  block = false;
  width: string = null;
  height: string = null;
  maxWidth: string = null;
  maxHeight: string = null;
  float: string;
  margin: string;

  get size() {
    return {
      width: this.width,
      height: this.height
    };
  }

  get maxSize() {
    return {
      width: this.maxWidth,
      height: this.maxHeight
    };
  }

  private loadedImages: string[] = [];

  constructor(public src: string, options: ImageOptions = {
    maxWidth: '100%'
  }) {
    super('img');
    this.width = options.width;
    this.height = options.height;
    this.maxWidth = options.maxWidth;
    this.maxHeight = options.maxHeight;
    this.float = options.float;
    this.margin = options.margin;
  }

  render(isOutputMode: boolean) {
    const el = new VElement(this.tagName);
    if (isOutputMode || this.loadedImages.includes(this.src)) {
      el.attrs.set('src', this.src);
    } else {
      el.attrs.set('src', imageLoadingSrc);
      const shadowImage = new Image();
      const src = this.src;
      let nativeImage: HTMLImageElement;
      el.onRendered = nativeNode => {
        nativeImage = nativeNode as HTMLImageElement
      };

      const s = fromEvent(shadowImage, 'load').pipe(auditTime(300)).subscribe(() => {
        this.loadedImages.push(src);
        nativeImage.classList.add('tb-image-loaded');
        nativeImage.src = src;
        el.attrs.set('src', src);
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
    if (this.maxWidth) {
      el.styles.set('maxWidth', this.maxWidth);
    }
    if (this.maxHeight) {
      el.styles.set('maxHeight', this.maxHeight);
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
    const img =  new ImageComponent(this.src, {
      width: this.width,
      height: this.height,
      maxWidth: this.maxWidth,
      maxHeight: this.maxHeight,
      float: this.float,
      margin: this.margin
    });
    img.loadedImages = this.loadedImages.map(i => i);
    return img;
  }
}
