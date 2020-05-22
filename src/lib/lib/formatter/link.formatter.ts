import { Formatter, MatchRule, FormatEffect } from '../core/formatter';
import { FormatAbstractData } from '../core/format-abstract-data';
import { VElement } from '../core/element';
import { ChildSlotModel } from '../core/renderer';

export class LinkFormatter extends Formatter {
  constructor() {
    super({
      tags: ['a']
    });
  }

  read(node: HTMLElement): FormatAbstractData {
    return this.extractData(node, {
      tag: true,
      attrs: ['target', 'href']
    });
  }

  render(state: FormatEffect, abstractData: FormatAbstractData, existingElement?: VElement) {
    const el = new VElement('a');
    el.attrs.set('target', abstractData.attrs.get('target'));
    el.attrs.set('href', abstractData.attrs.get('href'));
    return new ChildSlotModel(el);
  }
}

export const linkFormatter = new LinkFormatter();
