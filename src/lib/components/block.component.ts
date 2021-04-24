import { Injectable } from '@tanbo/di';

import {
  Component,
  ComponentLoader,
  DivisionAbstractComponent,
  FormatEffect,
  Interceptor,
  SingleSlotRenderFn,
  SlotRenderFn,
  TBEvent,
  TBSelection,
  VElement,
  ViewData
} from '../core/_api';
import { breakingLine } from './utils/breaking-line';
import { boldFormatter } from '../formatter/bold.formatter';

class BlockComponentLoader implements ComponentLoader {
  match(component: HTMLElement): boolean {
    return BlockComponent.blockTags.includes(component.nodeName.toLowerCase());
  }

  read(el: HTMLElement): ViewData {
    const component = new BlockComponent(el.tagName.toLocaleLowerCase());
    return {
      component: component,
      slotsMap: [{
        from: el,
        toSlot: component.slot
      }]
    };
  }
}

@Injectable()
class BlockComponentInterceptor implements Interceptor<BlockComponent> {
  constructor(private selection: TBSelection) {
  }

  onEnter(event: TBEvent<BlockComponent>) {
    const parent = event.instance.parentFragment;

    const component = new BlockComponent(event.instance.tagName === 'div' ? 'div' : 'p');
    const firstRange = this.selection.firstRange;
    const next = breakingLine(firstRange.startFragment, firstRange.startIndex);
    if (/h[1-6]/i.test(event.instance.tagName)) {
      const boldFormats = next.getFormatRanges(boldFormatter);
      boldFormats.forEach(i => {
        if (i.effect === FormatEffect.Inherit) {
          next.apply(boldFormatter, {
            ...i,
            effect: FormatEffect.Invalid
          })
        }
      })
    }
    component.slot.from(next);
    parent.insertAfter(component, event.instance);
    const position = firstRange.findFirstPosition(component.slot);
    firstRange.setPosition(position.fragment, position.index);
    event.stopPropagation();
  }
}

@Component({
  loader: new BlockComponentLoader(),
  providers: [{
    provide: Interceptor,
    useClass: BlockComponentInterceptor
  }],
  styles: [
    `blockquote {padding: 10px 15px; border-left: 10px solid #dddee1; background-color: #f8f8f9; margin: 1em 0; border-radius: 4px;}`
  ]
})
export class BlockComponent extends DivisionAbstractComponent {
  static blockTags = 'div,p,h1,h2,h3,h4,h5,h6,blockquote,article,section,nav,header,footer'.split(',');

  constructor(tagName: string) {
    super(tagName);
  }

  clone() {
    const component = new BlockComponent(this.tagName);
    component.slot.from(this.slot.clone());
    return component;
  }

  slotRender(isOutputMode: boolean, slotRendererFn: SingleSlotRenderFn): VElement {
    return slotRendererFn(this.slot, new VElement(this.tagName));
  }

  render(isOutputMode: boolean, slotRendererFn: SlotRenderFn) {
    return slotRendererFn(this.slot)
  }
}
