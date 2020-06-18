import {
  InlineFormatter,
  FormatEffect,
  FormatAbstractData,
  VElement,
  ChildSlotModel,
  FormatterPriority
} from '../core/_api';

export class LinkFormatter extends InlineFormatter {
  constructor() {
    super({
      tags: ['a']
    }, FormatterPriority.InlineTag);
  }

  read(node: HTMLElement): FormatAbstractData {
    return this.extractData(node, {
      tag: true,
      attrs: ['target', 'href']
    });
  }

  render(isProduction: boolean, state: FormatEffect, abstractData: FormatAbstractData, existingElement?: VElement) {
    const el = new VElement('a');
    const target = abstractData.attrs.get('target');
    const href = abstractData.attrs.get('href');
    target && el.attrs.set('target', target);
    href && el.attrs.set(isProduction ? 'href' : 'data-href', href);
    return new ChildSlotModel(el);
  }
}

export const linkFormatter = new LinkFormatter();
