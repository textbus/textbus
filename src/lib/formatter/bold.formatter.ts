import {
  ChildSlotMode,
  FormatData,
  FormatEffect, FormatRendingContext,
  FormatterPriority,
  InlineFormatter,
  VElement
} from '../core/_api';

export class BoldFormatter extends InlineFormatter {
  constructor() {
    super({
      extendTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'th'],
      tags: ['strong', 'b'],
      styles: {
        fontWeight: ['bold', '500', '600', '700', '800', '900']
      },
      excludeStyles: {
        fontWeight: ['normal', 'lighter', '100', '200', '300', '400']
      }
    }, FormatterPriority.InlineTag);
  }

  read(node: HTMLElement): FormatData {
    return this.extractData(node, {
      tag: true,
      styleName: 'fontWeight'
    });
  }

  render(context: FormatRendingContext, existingElement?: VElement) {
    if (context.effect === FormatEffect.Inherit) {
      return;
    }
    if (context.effect === FormatEffect.Exclude) {
      if (existingElement) {
        existingElement.styles.set('fontWeight', 'normal');
        return
      }
      const el = new VElement('span');
      el.styles.set('fontWeight', 'normal');
      return new ChildSlotMode(el);
    }
    return new ChildSlotMode(new VElement('strong'));
  }
}

export const boldFormatter = new BoldFormatter();
