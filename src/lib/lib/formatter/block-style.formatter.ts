import { MatchRule, FormatEffect, BlockFormatter, FormatAbstractData, VElement, ChildSlotModel } from '../core/_api';

export class BlockStyleFormatter extends BlockFormatter {
  constructor(public styleName: string, rule: MatchRule) {
    super(rule);
  }

  read(node: HTMLElement): FormatAbstractData {
    return this.extractData(node, {
      styleName: this.styleName
    });
  }

  render(isProduction: boolean, state: FormatEffect, abstractData: FormatAbstractData, existingElement?: VElement) {
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
