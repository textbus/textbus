import { Formatter, MatchRule, MatchState } from '../core/formatter';
import { AbstractData } from '../core/abstract-data';
import { VElement } from '../core/element';
import { ChildSlotModel } from '../core/renderer';

export class StyleFormatter extends Formatter {
  constructor(public styleName: string, rule: MatchRule) {
    super(rule);
  }

  read(node: HTMLElement): AbstractData {
    return this.extractData(node, {
      styleName: this.styleName
    });
  }

  render(state: MatchState, abstractData: AbstractData, existingElement?: VElement) {
    if (existingElement) {
      existingElement.styles.set(this.styleName, abstractData.style.value);
    } else {
      const el = new VElement('span');
      el.styles.set(this.styleName, abstractData.style.value);
      return new ChildSlotModel(el);
    }
  }
}

export const colorFormatter = new StyleFormatter('color', {
  styles: {
    color: /.+/
  }
});

export const fontSizeFormatter = new StyleFormatter('fontSize', {
  styles: {
    fontSize: /.+/
  }
});
