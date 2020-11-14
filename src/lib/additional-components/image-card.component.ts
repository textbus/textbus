import {
  EventType,
  ComponentReader,
  VElement,
  ViewData,
  BackboneComponent,
  Fragment, SlotRendererFn
} from '../core/_api';
import { ComponentExample } from '../workbench/component-stage';
import { BlockComponent, ImageComponent, BrComponent } from '../components/_api';

const svg = '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><g><rect fill="#555" height="100%" width="100%"/></g><g><text font-family="Helvetica, Arial, sans-serif" font-size="24" y="50%" x="50%" text-anchor="middle" dominant-baseline="middle" stroke-width="0" stroke="#000" fill="#000000">Image</text></g></svg>';
const defaultImageSrc = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);

export class ImageCardComponentReader implements ComponentReader {
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tb-image-card';
  }

  from(element: HTMLElement): ViewData {
    const imageWrapper = new Fragment();
    const desc = new Fragment();
    const component = new ImageCardComponent({
      imgFragment: imageWrapper,
      descFragment: desc
    });
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

export class ImageCardComponent extends BackboneComponent {
  readonly imgFragment: Fragment;
  readonly descFragment: Fragment;

  constructor(options: { imgFragment: Fragment, descFragment: Fragment }) {
    super('tb-image-card');
    this.imgFragment = options.imgFragment;
    this.descFragment = options.descFragment;

    this.push(this.imgFragment);
    this.push(this.descFragment);

    this.imgFragment.events.subscribe(ev => {
      ev.stopPropagation();
    });

    this.descFragment.events.subscribe(ev => {
      if (!ev.selection) {
        return;
      }
      const firstRange = ev.selection.firstRange;
      if (ev.type === EventType.onEnter) {
        const parentFragment = this.parentFragment;
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

  canDelete(deletedSlot: Fragment): boolean {
    return deletedSlot === this.imgFragment;
  }

  componentContentChange() {
    this.push(this.imgFragment, this.descFragment);
    this.clean();
    if (this.descFragment.contentLength === 0) {
      this.descFragment.append(new BrComponent());
    }
  }

  render(isOutputMode: boolean, slotRendererFn: SlotRendererFn): VElement {
    const card = new VElement(this.tagName);
    const imgWrapper = new VElement('div');
    const desc = new VElement('p');
    card.appendChild(slotRendererFn(this.imgFragment, imgWrapper));
    card.appendChild(slotRendererFn(this.descFragment, desc));

    return card;
  }

  clone(): ImageCardComponent {
    return new ImageCardComponent({
      imgFragment: this.imgFragment.clone(),
      descFragment: this.descFragment.clone()
    });
  }
}


export const imageCardComponentExample: ComponentExample = {
  name: '卡片',
  example: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f90"/><stop offset="100%" stop-color="#fff"/></linearGradient></defs><g><rect fill="url(#bg)" height="50" width="100%"/></g><g><path fill="#f00" opacity="0.2" d="M81.25 28.125c0 5.178-4.197 9.375-9.375 9.375s-9.375-4.197-9.375-9.375 4.197-9.375 9.375-9.375 9.375 4.197 9.375 9.375z"></path><path fill="#0e0" opacity="0.3" d="M87.5 81.25h-75v-12.5l21.875-37.5 25 31.25h6.25l21.875-18.75z"></path></g><g><rect fill="#fff" height="20" width="100%" y="50"></rect></g><g><text font-family="Helvetica, Arial, sans-serif" font-size="12" y="63" x="50%" text-anchor="middle" stroke-width="0" stroke="#000" fill="#000000">描述文字</text></g></svg>')}">`,
  componentFactory() {
    const imgFragment = new Fragment();
    imgFragment.append(new ImageComponent(defaultImageSrc));
    const descFragment = new Fragment();
    descFragment.append('图片描述');
    return new ImageCardComponent({
      imgFragment,
      descFragment
    });
  }
}

export const imageCardStyleSheet = `
tb-image-card {
  display: block;
  margin-top: 10px;
  margin-bottom: 20px;
  box-shadow: 1px 2px 3px rgba(0, 0, 0, .1);
  border-radius: 3px;
  overflow: hidden;
}
tb-image-card > div > img {
  width: 100%;
  display: block;
  min-height: 40px;
}
tb-image-card > p {
  margin: 0;
  text-align: center;
  font-size: 15px;
  color: #aaa;
  height: 24px;
  line-height: 24px;
  padding: 6px 20px;
}
`
