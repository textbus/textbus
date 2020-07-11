import { LeafTemplate, TemplateTranslator, ViewData, VElement } from '../core/_api';

export class ImageTemplateTranslator implements TemplateTranslator {
  private tagName = 'img';

  match(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLImageElement): ViewData {
    return {
      template: new ImageTemplate(el.src, {
        width: el.style.width || el.width + '',
        height: el.style.height || el.height +  ''
      }),
      childrenSlots: []
    };
  }
}

export class ImageTemplate extends LeafTemplate {
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

  clone(): ImageTemplate {
    return new ImageTemplate(this.src, {
      width: this.width,
      height: this.height
    });
  }
}
