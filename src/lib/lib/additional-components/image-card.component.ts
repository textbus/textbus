import {
  BranchComponent, DivisionComponent,
  EventType,
  Fragment, Lifecycle, Renderer, TBSelection,
  ComponentReader,
  VElement,
  ViewData
} from '../core/_api';
import { ComponentExample } from '../workbench/component-stage';
import { BlockComponent, ImageComponent, BrComponent } from '../components/_api';

const svg = '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><g><rect fill="#555" height="100%" width="100%"/></g><g><text font-family="Helvetica, Arial, sans-serif" font-size="24" y="50%" x="50%" text-anchor="middle" dominant-baseline="middle" stroke-width="0" stroke="#000" fill="#000000">Image</text></g></svg>';
const defaultImageSrc = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);

export class ImageCardComponentReader implements ComponentReader {
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tbus-image-card';
  }

  from(element: HTMLElement): ViewData {
    const imageSrc = (element.children[0].children[0] as HTMLImageElement).src;
    const component = new ImageCardComponent(imageSrc);
    const imageWrapper = new Fragment();
    const desc = new Fragment();
    component.slots.push(imageWrapper, desc);
    return {
      component: component,
      slotsMap: [{
        from: element.children[0] as HTMLElement,
        toSlot: imageWrapper
      }, {
        from: element.children[1] as HTMLElement,
        toSlot: desc
      }]
    }
  }
}

export class ImageCardComponent extends BranchComponent {
  readonly imgFragment = new Fragment();
  readonly descFragment = new Fragment();

  constructor(public imageSrc: string) {
    super('tbus-image-card');
    this.imgFragment.append(new ImageComponent(imageSrc));
    this.descFragment.append('图片描述');
    this.slots.push(this.imgFragment);
    this.slots.push(this.descFragment);
  }

  canSplit(): boolean {
    return false;
  }

  render(isProduction: boolean): VElement {
    this.viewMap.clear();
    this.slots = [this.imgFragment, this.descFragment];
    const card = new VElement(this.tagName);
    const imgWrapper = new VElement('div');
    const desc = new VElement('p');
    card.appendChild(imgWrapper);
    card.appendChild(desc);
    this.viewMap.set(this.imgFragment, imgWrapper);

    if (this.descFragment.contentLength === 0) {
      this.descFragment.append(new BrComponent());
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
          const p = new BlockComponent('p');
          p.slot.append(new BrComponent());
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

  clone(): ImageCardComponent {
    const t = new ImageCardComponent(this.imageSrc);
    t.slots = this.slots.map(f => f.clone());
    return t;
  }
}


export const imageCardComponentExample: ComponentExample = {
  name: '卡片',
  example: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg"><g><rect fill="#aaa" height="50" width="100%"/></g><g><text font-family="Helvetica, Arial, sans-serif" font-size="16" y="24" x="50%" text-anchor="middle" dominant-baseline="middle" stroke-width="0" stroke="#000" fill="#000000">Image</text></g><g><text font-family="Helvetica, Arial, sans-serif" font-size="12" y="63" x="50%" text-anchor="middle" stroke-width="0" stroke="#000" fill="#000000">描述文字</text></g></svg>')}">`,
  componentFactory() {
    return new ImageCardComponent(defaultImageSrc);
  }
}

export class ImageCardHook implements Lifecycle {
  onDelete(renderer: Renderer, selection: TBSelection): boolean {
    const firstRange = selection.firstRange;
    const component = firstRange.commonAncestorComponent;
    if (component instanceof ImageCardComponent && firstRange.startFragment === component.imgFragment) {
      if (component.imgFragment.contentLength === 0) {
        let position = firstRange.getPreviousPosition();
        const parentFragment = renderer.getParentFragment(component);
        const index = parentFragment.indexOf(component);
        parentFragment.remove(index, 1);

        if (parentFragment.contentLength === 0) {
          firstRange.deleteEmptyTree(parentFragment);
        }

        if (position.fragment === firstRange.startFragment) {
          const nextContent = parentFragment.getContentAtIndex(index);
          if (nextContent instanceof DivisionComponent) {
            position = firstRange.findFirstPosition(nextContent.slot);
          } else if (nextContent instanceof BranchComponent) {
            if (nextContent.slots[0]) {
              position = firstRange.findFirstPosition(nextContent.slots[0]);
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
      return false;
    }
    return true;
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
