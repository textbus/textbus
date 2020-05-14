import { Formatter, MatchRule, MatchState } from '../core/formatter';
import { AbstractData } from '../core/abstract-data';
import { VElement } from '../core/element';
import { ChildSlotModel } from '../core/renderer';

class ColorFormatter extends Formatter {
  constructor(matchRule: MatchRule) {
    super(matchRule);
  }
  read(node: HTMLElement): AbstractData {
    return this.extractData(node, {
      styleName: 'color'
    });
  }

  render(state: MatchState, abstractData: AbstractData, existingElement?: VElement) {
    if (existingElement) {
      existingElement.styles.set('color', abstractData.style.value);
    } else {
      const el = new VElement('span');
      el.styles.set('color', abstractData.style.value);
      return new ChildSlotModel(el);
    }
  }
}

export const colorFormatter = new ColorFormatter({
  styles: {
    color: /.+/
  },
  noInTags: ['pre']
});
