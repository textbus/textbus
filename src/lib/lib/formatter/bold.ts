import { Formatter, MatchRule, MatchState } from '../core/formatter';
import { AbstractData } from '../core/abstract-data';
import { VElement } from '../core/element';
import { ChildSlotModel } from '../core/renderer';

class BoldFormatter extends Formatter {
  constructor(matchRule: MatchRule) {
    super(matchRule);
  }

  read(node: HTMLElement): AbstractData {
    return this.extractData(node, {
      tag: true,
      styleName: 'fontWeight'
    });
  }

  render(state: MatchState, abstractData: AbstractData, existingElement?: VElement) {
    if (existingElement && /(h[1-6])|th/i.test(existingElement.tagName)) {
      return;
    }
    return new ChildSlotModel(new VElement('strong'));
  }
}

export const boldFormatter = new BoldFormatter({
  extendTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'th'],
  tags: ['strong', 'b'],
  styles: {
    fontWeight: ['bold', '500', '600', '700', '800', '900']
  },
  excludeStyles: {
    fontWeight: ['normal', 'lighter', '100', '200', '300', '400']
  },
  noInTags: ['pre']
});
