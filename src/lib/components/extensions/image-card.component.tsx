import {
  ComponentLoader,
  VElement,
  ViewData,
  BackboneAbstractComponent,
  Fragment, SlotRenderFn, BrComponent, Component, Interceptor, TBEvent, TBSelection, TBClipboard, SingleSlotRenderFn
} from '../../core/_api';
import { ComponentCreator } from '../../ui/extensions/component-stage.plugin';
import { BlockComponent, ImageComponent } from '../_api';
import { Injectable } from '@tanbo/di';

const svg = '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><g><rect fill="#555" height="100%" width="100%"/></g><g><text font-family="Helvetica, Arial, sans-serif" font-size="24" y="50%" x="50%" text-anchor="middle" dominant-baseline="middle" stroke-width="0" stroke="#000" fill="#000000">Image</text></g></svg>';
const defaultImageSrc = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);

class ImageCardComponentLoader implements ComponentLoader {
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tb-image-card';
  }

  read(element: HTMLElement): ViewData {
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

@Injectable()
class ImageCardComponentInterceptor implements Interceptor<ImageCardComponent> {
  constructor(private selection: TBSelection) {
  }

  onInput(event: TBEvent<ImageCardComponent>) {
    if (this.selection.commonAncestorFragment === event.instance.imgFragment) {
      event.stopPropagation();
    }
  }

  onPaste(event: TBEvent<ImageCardComponent, TBClipboard>) {
    if (this.selection.commonAncestorFragment === event.instance.imgFragment) {
      event.stopPropagation();
    }
  }

  onDelete(event: TBEvent<ImageCardComponent>) {
    const {commonAncestorFragment, firstRange} = this.selection;
    if (commonAncestorFragment === event.instance.imgFragment) {
      event.stopPropagation();
    } else if (commonAncestorFragment === event.instance.descFragment && firstRange.startIndex === 0) {
      event.stopPropagation();
    }
  }

  onEnter(event: TBEvent<ImageCardComponent>) {
    const {firstRange, commonAncestorFragment} = this.selection;
    if (commonAncestorFragment === event.instance.descFragment) {
      const parentFragment = event.instance.parentFragment;
      const p = new BlockComponent('p');
      p.slot.append(new BrComponent());
      parentFragment.insertAfter(p, event.instance);
      firstRange.setStart(p.slot, 0);
      firstRange.collapse();
    }
    event.stopPropagation();
  }
}

@Component({
  loader: new ImageCardComponentLoader(),
  providers: [{
    provide: Interceptor,
    useClass: ImageCardComponentInterceptor
  }],
  styles: [
    `
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
  ]
})
export class ImageCardComponent extends BackboneAbstractComponent {
  block = false;
  readonly imgFragment: Fragment;
  readonly descFragment: Fragment;

  constructor(options: { imgFragment: Fragment, descFragment: Fragment }) {
    super('tb-image-card');
    this.imgFragment = options.imgFragment;
    this.descFragment = options.descFragment;

    this.push(this.imgFragment);
    this.push(this.descFragment);
  }

  canDelete(deletedSlot: Fragment): boolean {
    return deletedSlot === this.imgFragment;
  }

  componentContentChange() {
    if (this.descFragment.length === 0) {
      this.descFragment.append(new BrComponent());
    }
  }

  slotRender(slot: Fragment, isOutputMode: boolean, slotRendererFn: SingleSlotRenderFn): VElement {
    let imgContainer: VElement;
    let descContainer: VElement;
    switch (slot) {
      case this.imgFragment:
        imgContainer = <div/>;
        return slotRendererFn(slot, imgContainer);
      case this.descFragment:
        descContainer = <p/>;
        return slotRendererFn(slot, descContainer);
    }
  }

  render(isOutputMode: boolean, slotRendererFn: SlotRenderFn): VElement {
    const card = <tb-image-card/>;
    card.appendChild(slotRendererFn(this.imgFragment));
    card.appendChild(slotRendererFn(this.descFragment));

    return card;
  }

  clone(): ImageCardComponent {
    return new ImageCardComponent({
      imgFragment: this.imgFragment.clone(),
      descFragment: this.descFragment.clone()
    });
  }
}

export const imageCardComponentExample: ComponentCreator = {
  name: i18n => i18n.get('components.imageCardComponent.creator.name'),
  category: 'TextBus',
  example: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f90"/><stop offset="100%" stop-color="#fff"/></linearGradient></defs><g><rect fill="url(#bg)" height="50" width="100%"/></g><g><path fill="#f00" opacity="0.2" d="M81.25 28.125c0 5.178-4.197 9.375-9.375 9.375s-9.375-4.197-9.375-9.375 4.197-9.375 9.375-9.375 9.375 4.197 9.375 9.375z"></path><path fill="#0e0" opacity="0.3" d="M87.5 81.25h-75v-12.5l21.875-37.5 25 31.25h6.25l21.875-18.75z"></path></g><g><rect fill="#fff" height="20" width="100%" y="50"></rect></g><g><text font-family="Helvetica, Arial, sans-serif" font-size="12" y="63" x="50%" text-anchor="middle" stroke-width="0" stroke="#000" fill="#000000">描述文字</text></g></svg>')}" alt="">`,
  factory() {
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
