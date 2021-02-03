import {
  InlineFormatter,
  FormatData,
  VElement,
  ChildSlotMode,
  FormatterPriority, FormatRendingContext
} from '../core/_api';

export class LinkFormatter extends InlineFormatter {
  constructor() {
    super({
      tags: ['a']
    }, FormatterPriority.InlineTag);
  }

  read(node: HTMLElement): FormatData {
    return this.extractData(node, {
      tag: true,
      attrs: ['target', 'href']
    });
  }

  render(context: FormatRendingContext) {
    const el = new VElement('a');
    const target = context.abstractData.attrs.get('target');
    const href = context.abstractData.attrs.get('href');
    target && el.attrs.set('target', target);
    href && el.attrs.set(context.isOutputMode ? 'href' : 'data-href', href);
    return new ChildSlotMode(el);
  }
}

export const linkFormatter = new LinkFormatter();
