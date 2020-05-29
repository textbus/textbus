import { MatchRule, FormatEffect, BlockFormatter } from '../core/formatter';
import { FormatAbstractData } from '../core/format-abstract-data';
import { VElement } from '../core/element';
import { ChildSlotModel } from '../core/renderer';

export class BlockStyleFormatter extends BlockFormatter {
  constructor(public styleName: string, rule: MatchRule) {
    super(rule);
  }

  read(node: HTMLElement): FormatAbstractData {
    return this.extractData(node, {
      styleName: this.styleName
    });
  }

  render(state: FormatEffect, abstractData: FormatAbstractData, existingElement?: VElement) {
    if (existingElement) {
      existingElement.styles.set(this.styleName, abstractData.style.value);
    } else {
      const el = new VElement('div');
      el.styles.set(this.styleName, abstractData.style.value);
      return new ChildSlotModel(el);
    }
  }
}
export const textIndentFormatter = new BlockStyleFormatter('textIndent', {
  styles: {
    textIndent: /.+/
  }
});
export const textAlignFormatter = new BlockStyleFormatter('textAlign', {
  styles: {
    textAlign: /.+/
  }
});
