import {
  InlineFormatter,
  FormatEffect,
  FormatData,
  FormatRendingContext,
  VElement,
  ChildSlotMode,
  FormatterPriority
} from '../core/_api';

export class VerticalAlignFormatter extends InlineFormatter {
  constructor() {
    super({
      styles: {
        verticalAlign: /.+/
      }
    }, FormatterPriority.InlineStyle);
  }

  match(p: HTMLElement | FormatData): FormatEffect {
    return super.match(p);
  }

  read(node: HTMLElement): FormatData {
    return this.extractData(node, {
      styleName: 'verticalAlign'
    });
  }

  render(context: FormatRendingContext, existingElement?: VElement): ChildSlotMode | null {
    if (existingElement && /^(span|em|i|s|del|sup|sub|u|strong|img)$/i.test(existingElement.tagName)) {
      existingElement.styles.set('verticalAlign', context.formatData.styles.get('verticalAlign'));
      return null
    }
    existingElement = new VElement('span');
    existingElement.styles.set('verticalAlign', context.formatData.styles.get('verticalAlign'));
    return new ChildSlotMode(existingElement);
  }
}

export const verticalAlignFormatter = new VerticalAlignFormatter();
