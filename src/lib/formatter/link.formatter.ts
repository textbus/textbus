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
    const data = this.extractData(node, {
      tag: true,
      attrs: ['target', 'href', 'data-href']
    });
    if (data.attrs.get('href')) {
      data.attrs.delete('data-href');
    }
    return data;
  }

  render(context: FormatRendingContext) {
    const el = new VElement('a');
    const target = context.formatData.attrs.get('target');
    const href = context.formatData.attrs.get('href') || context.formatData.attrs.get('data-href');
    target && el.attrs.set('target', target);
    href && el.attrs.set(context.isOutputMode ? 'href' : 'data-href', href);
    return new ChildSlotMode(el);
  }
}

export const linkFormatter = new LinkFormatter();
