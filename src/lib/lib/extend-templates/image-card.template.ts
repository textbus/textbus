import { BackboneTemplate, EventType, Fragment, TemplateTranslator, VElement, ViewData } from '../core/_api';
import { TemplateExample } from '../template-stage/template-stage';
import { ImageTemplate, SingleTagTemplate } from '../templates/_api';

const svg = '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><g><rect fill="#555" height="100%" width="100%"/></g><g><text font-family="Helvetica, Arial, sans-serif" font-size="24" y="50%" x="50%" text-anchor="middle" dominant-baseline="middle" stroke-width="0" stroke="#000" fill="#000000">Image</text></g></svg>';
const defaultImageSrc = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);

export class ImageCardTemplateTranslator implements TemplateTranslator {
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tbus-image-card';
  }

  from(element: HTMLElement): ViewData {
    const imageSrc = (element.children[0].children[0] as HTMLImageElement).src;
    const template = new ImageCardTemplate(imageSrc);
    const imageWrapper = new Fragment();
    const desc = new Fragment();
    template.childSlots.push(imageWrapper, desc);
    return {
      template,
      childrenSlots: [{
        from: element.children[0] as HTMLElement,
        toSlot: imageWrapper
      }, {
        from: element.children[1] as HTMLElement,
        toSlot: desc
      }]
    }
  }
}

export class ImageCardTemplate extends BackboneTemplate {
  canSplit = false;
  constructor(public imageSrc: string) {
    super('tbus-image-card');
  }

  render(isProduction: boolean): VElement {
    this.viewMap.clear();
    const card = new VElement(this.tagName);
    const imgWrapper = new VElement('div');
    const desc = new VElement('p');
    card.appendChild(imgWrapper);
    card.appendChild(desc);
    let imgFragment = this.childSlots[0];
    if (!imgFragment) {
      imgFragment = new Fragment();
      this.childSlots.push(imgFragment);
    }
    if (imgFragment.contentLength === 0) {
      imgFragment.append(new ImageTemplate(defaultImageSrc));
    }
    this.viewMap.set(this.childSlots[0], imgWrapper);

    let descFragment = this.childSlots[1];
    if (!descFragment) {
      descFragment = new Fragment();
      this.childSlots.push(descFragment);
    }
    if (descFragment.contentLength === 0) {
      descFragment.append(new SingleTagTemplate('br'));
    }
    this.viewMap.set(descFragment, desc);

    imgWrapper.events.subscribe(ev => {
      ev.stopPropagation();
    })

    desc.events.subscribe(ev => {
      if (ev.type === EventType.onDelete && ev.selection.firstRange.startIndex === 0) {
        ev.stopPropagation();
      }
    })

    return card;
  }

  clone(): ImageCardTemplate {
    const t = new ImageCardTemplate(this.imageSrc);
    t.childSlots = this.childSlots.map(f => f.clone());
    return t;
  }
}



export const imageCardTemplateExample: TemplateExample = {
  example: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg"><g><rect fill="#aaa" height="50" width="100%"/></g><g><text font-family="Helvetica, Arial, sans-serif" font-size="16" y="24" x="50%" text-anchor="middle" dominant-baseline="middle" stroke-width="0" stroke="#000" fill="#000000">Image</text></g><g><text font-family="Helvetica, Arial, sans-serif" font-size="12" y="63" x="50%" text-anchor="middle" stroke-width="0" stroke="#000" fill="#000000">描述文字</text></g></svg>')}">`,
  templateFactory() {
    const t = new ImageCardTemplate(defaultImageSrc);
    const imgWrapper = new Fragment();
    const img = new ImageTemplate(t.imageSrc);
    imgWrapper.append(img);
    const desc = new Fragment();
    desc.append('图片描述');
    t.childSlots.push(imgWrapper);
    t.childSlots.push(desc);
    return t;
  }
}

export const imageCardStyleSheet = `
tbus-image-card {
  display: block;
  margin-top: 10px;
  margin-bottom: 20px;
  box-shadow: 1px 2px 3px rgba(0, 0, 0, .1);
  border-radius: 3px;
  overflow: hidden;
}
tbus-image-card > div > img {
  width: 100%;
  display: block;
  min-height: 40px;
}
tbus-image-card > p {
  margin: 0;
  text-align: center;
  font-size: 15px;
  color: #aaa;
  height: 24px;
  line-height: 24px;
  padding: 6px 20px;
}
`
