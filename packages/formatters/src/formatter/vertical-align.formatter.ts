import {
  InlineFormatter,
  FormatData,
  FormatRendingContext,
  VElement,
  FormatterPriority
} from '@textbus/core';

export class VerticalAlignFormatter extends InlineFormatter {
  constructor() {
    super({
      styles: {
        verticalAlign: /.+/
      }
    }, FormatterPriority.InlineStyle);
  }

  read(node: HTMLElement): FormatData {
    return this.extractData(node, {
      styleName: 'verticalAlign'
    });
  }

  render(context: FormatRendingContext, existingElement?: VElement) {
    if (existingElement && /^(span|em|i|s|del|sup|sub|u|strong|img)$/i.test(existingElement.tagName)) {
      existingElement.styles.set('verticalAlign', context.formatData.styles.get('verticalAlign'));
      return null
    }
    existingElement = new VElement('span');
    existingElement.styles.set('verticalAlign', context.formatData.styles.get('verticalAlign'));
    return existingElement;
  }
}

export const verticalAlignFormatter = new VerticalAlignFormatter();
