import { InlineFormatter, MatchRule, FormatEffect } from '../core/formatter';
import { FormatAbstractData } from '../core/format-abstract-data';
import { VElement } from '../core/element';
import { ChildSlotModel } from '../core/renderer';

export class LinkFormatter extends InlineFormatter {
  constructor() {
    super({
      tags: ['a']
    }, 0);
  }

  read(node: HTMLElement): FormatAbstractData {
    return this.extractData(node, {
      tag: true,
      attrs: ['target', 'href']
    });
  }

  render(state: FormatEffect, abstractData: FormatAbstractData, existingElement?: VElement) {
    const el = new VElement('a');
    const target = abstractData.attrs.get('target');
    const href = abstractData.attrs.get('href');
    target && el.attrs.set('target', target);
    href && el.attrs.set('data-href', href);
    return new ChildSlotModel(el);
  }
}

export const linkFormatter = new LinkFormatter();
