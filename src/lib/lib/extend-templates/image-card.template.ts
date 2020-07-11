import {
  BackboneTemplate, BranchTemplate,
  EventType,
  Fragment, Lifecycle, Renderer, TBSelection,
  TemplateTranslator,
  VElement,
  ViewData
} from '../core/_api';
import { TemplateExample } from '../workbench/template-stage';
import { BlockTemplate, ImageTemplate, SingleTagTemplate } from '../templates/_api';

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
  readonly imgFragment = new Fragment();
  readonly descFragment = new Fragment();

  constructor(public imageSrc: string) {
    super('tbus-image-card');
    this.imgFragment.append(new ImageTemplate(imageSrc));
    this.descFragment.append('图片描述');
    this.childSlots.push(this.imgFragment);
    this.childSlots.push(this.descFragment);
  }

  canSplit(): boolean {
    return false;
  }

  render(isProduction: boolean): VElement {
    this.viewMap.clear();
    this.childSlots = [this.imgFragment, this.descFragment];
    const card = new VElement(this.tagName);
    const imgWrapper = new VElement('div');
    const desc = new VElement('p');
    card.appendChild(imgWrapper);
    card.appendChild(desc);
    this.viewMap.set(this.imgFragment, imgWrapper);

    if (this.descFragment.contentLength === 0) {
      this.descFragment.append(new SingleTagTemplate('br'));
    }
    this.viewMap.set(this.descFragment, desc);
    if (!isProduction) {
      imgWrapper.events.subscribe(ev => {
        ev.stopPropagation();
      });

      desc.events.subscribe(ev => {
        if (!ev.selection) {
          return;
        }
        const firstRange = ev.selection.firstRange;
        if (ev.type === EventType.onEnter) {
          const parentFragment = ev.renderer.getParentFragment(this);
          const p = new BlockTemplate('p');
          p.slot.append(new SingleTagTemplate('br'));
          parentFragment.insertAfter(p, this);
          firstRange.setStart(p.slot, 0);
          firstRange.collapse();
          ev.stopPropagation();
        }
        if (ev.type === EventType.onDelete && firstRange.startIndex === 0) {
          ev.stopPropagation();
        }
      })
    }

    return card;
  }

  clone(): ImageCardTemplate {
    const t = new ImageCardTemplate(this.imageSrc);
    t.childSlots = this.childSlots.map(f => f.clone());
    return t;
  }
}


export const imageCardTemplateExample: TemplateExample = {
  name: '卡片',
  example: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg"><g><rect fill="#aaa" height="50" width="100%"/></g><g><text font-family="Helvetica, Arial, sans-serif" font-size="16" y="24" x="50%" text-anchor="middle" dominant-baseline="middle" stroke-width="0" stroke="#000" fill="#000000">Image</text></g><g><text font-family="Helvetica, Arial, sans-serif" font-size="12" y="63" x="50%" text-anchor="middle" stroke-width="0" stroke="#000" fill="#000000">描述文字</text></g></svg>')}">`,
  templateFactory() {
    return new ImageCardTemplate(defaultImageSrc);
  }
}

export class ImageCardHook implements Lifecycle {
  onDelete(renderer: Renderer, selection: TBSelection): boolean {
    const firstRange = selection.firstRange;
    const template = firstRange.commonAncestorTemplate;
    if (template instanceof ImageCardTemplate) {
      if (template.imgFragment.contentLength === 0) {
        let position = firstRange.getPreviousPosition();
        const parentFragment = renderer.getParentFragment(template);
        const index = parentFragment.indexOf(template);
        parentFragment.remove(index, 1);

        if (parentFragment.contentLength === 0) {
          firstRange.deleteEmptyTree(parentFragment);
        }

        if (position.fragment === firstRange.startFragment) {
          const nextContent = parentFragment.getContentAtIndex(index);
          if (nextContent instanceof BranchTemplate) {
            position = firstRange.findFirstPosition(nextContent.slot);
          } else if (nextContent instanceof BackboneTemplate) {
            if (nextContent.childSlots[0]) {
              position = firstRange.findFirstPosition(nextContent.childSlots[0]);
            }
          } else {
            position = {
              fragment: parentFragment,
              index
            };
          }
        }
        firstRange.setStart(position.fragment, position.index);
        firstRange.collapse();
      }
    }
    return false;
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
