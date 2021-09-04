import {
  Injectable,
  Component,
  ComponentLoader,
  DivisionAbstractComponent,
  FormatEffect,
  Formatter,
  Fragment,
  BrComponent,
  Interceptor,
  SingleSlotRenderFn,
  SlotRenderFn,
  InlineFormatter,
  TBEvent,
  TBSelection,
  VElement,
  ViewData, MarkdownSupport, MarkdownGrammarInterceptor
} from '@textbus/core';

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
    const next = BlockComponent.breakingLine(firstRange.startFragment, firstRange.startIndex);
    component.slot.from(next);
    parent.insertAfter(component, event.instance);
    const position = firstRange.findFirstPosition(component.slot);
    firstRange.setPosition(position.fragment, position.index);
    event.stopPropagation();
  }
}

@Injectable()
class BlockComponentMarkdownSupport implements MarkdownSupport {
  provide(): MarkdownGrammarInterceptor {
    return {
      key: ' ',
      match(content: string) {
        return /^#{1,6}$/.test(content)
      },
      componentFactory(content): BlockComponent {
        return new BlockComponent('h' + content.length)
      }
    }
  }
}

@Component({
  loader: new BlockComponentLoader(),
  providers: [{
    provide: Interceptor,
    useClass: BlockComponentInterceptor
  }, {
    provide: MarkdownSupport,
    useClass: BlockComponentMarkdownSupport
  }],
  styles: [
    `blockquote {padding: 10px 15px; border-left: 10px solid #dddee1; background-color: #f8f8f9; margin: 1em 0; border-radius: 4px;}`
  ]
})
export class BlockComponent extends DivisionAbstractComponent {
  static blockTags = 'div,p,h1,h2,h3,h4,h5,h6,blockquote,article,section,nav,header,footer'.split(',');

  static cleanedFormatters: Formatter[] = [];

  static breakingLine(fragment: Fragment, index: number): Fragment {
    if (index === 0) {
      fragment.insert(new BrComponent(), 0);
      index = 1;
    }

    const next = fragment.cut(index);
    if (next.length === 0) {
      next.append(new BrComponent());
      const contentLength = fragment.length;
      fragment.getFormatKeys().forEach(key => {
        if (key instanceof InlineFormatter) {
          fragment.getFormatRanges(key).forEach(f => {
            if (f.endIndex === contentLength) {
              next.apply(key, {
                ...f,
                startIndex: 0,
                endIndex: 1
              })
            }
          })
        }
      })
    }
    if (next.length === 1 && next.getContentAtIndex(0) instanceof BrComponent) {
      BlockComponent.cleanedFormatters.forEach(formatter => {
        next.apply(formatter, {
          startIndex: 0,
          endIndex: 1,
          effect: FormatEffect.Invalid,
          formatData: null
        })
      })
    }
    return next;
  }

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
