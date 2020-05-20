import { Formatter, MatchRule, MatchState } from '../core/formatter';
import { AbstractData } from '../core/abstract-data';
import { VElement } from '../core/element';
import { ChildSlotModel } from '../core/renderer';

export class LinkFormatter extends Formatter {
  constructor() {
    super({
      tags: ['a']
    });
  }

  read(node: HTMLElement): AbstractData {
    return this.extractData(node, {
      tag: true,
      attrs: ['target', 'href']
    });
  }

  render(state: MatchState, abstractData: AbstractData, existingElement?: VElement) {
    const el = new VElement('a');
    el.attrs.set('target', abstractData.attrs.get('target'));
    el.attrs.set('href', abstractData.attrs.get('href'));
    return new ChildSlotModel(el);
  }
}

export const linkFormatter = new LinkFormatter();
