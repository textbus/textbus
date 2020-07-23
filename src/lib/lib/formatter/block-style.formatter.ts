import {
  MatchRule,
  FormatEffect,
  BlockFormatter,
  FormatAbstractData,
  VElement,
  ChildSlotModel,
  FormatterPriority
} from '../core/_api';

export class BlockStyleFormatter extends BlockFormatter {
  constructor(public styleName: string | string[], rule: MatchRule) {
    super(rule, FormatterPriority.BlockStyle);
  }

  read(node: HTMLElement): FormatAbstractData {
    return this.extractData(node, {
      styleName: this.styleName
    });
  }

  render(isProduction: boolean, state: FormatEffect, abstractData: FormatAbstractData, existingElement?: VElement) {
    const b = !!existingElement;
    existingElement = existingElement || new VElement('div');
    (Array.isArray(this.styleName) ? this.styleName : [this.styleName]).forEach(name => {
      existingElement.styles.set(name, abstractData.styles.get(name));
    })
    if (!b) {
      return new ChildSlotModel(existingElement);
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
export const blockBackgroundColorFormatter = new BlockStyleFormatter('backgroundColor', {
  styles: {
    backgroundColor: /.+/
  }
});

const match = blockBackgroundColorFormatter.match;

blockBackgroundColorFormatter.match = function (p: HTMLElement | FormatAbstractData) {
  const blockTags = 'div,p,h1,h2,h3,h4,h5,h6,nav,header,footer,td,th,li,article'.split(',');
  const reg = new RegExp(`^(${blockTags.join('|')})$`, 'i');
  if (!reg.test(p instanceof FormatAbstractData ? p.tag : p.tagName)) {
    return FormatEffect.Invalid;
  }
  return match.call(blockBackgroundColorFormatter, p);
};
