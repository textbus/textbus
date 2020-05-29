import { InlineFormatter, MatchRule, FormatEffect } from '../core/formatter';
import { FormatAbstractData } from '../core/format-abstract-data';
import { VElement } from '../core/element';
import { ChildSlotModel } from '../core/renderer';

export class StyleFormatter extends InlineFormatter {
  constructor(public styleName: string, rule: MatchRule) {
    super(rule, 10);
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

export const backgroundColor = new StyleFormatter('backgroundColor', {
  styles: {
    backgroundColor: /.+/
  }
});

export const fontSizeFormatter = new StyleFormatter('fontSize', {
  styles: {
    fontSize: /.+/
  }
});

export const letterSpacingFormatter = new StyleFormatter('letterSpacing', {
  styles: {
    letterSpacing: /.+/
  }
});
export const fontFamilyFormatter = new StyleFormatter('fontFamily', {
  styles: {
    fontFamily: /.+/
  }
});
export const lineHeightFormatter = new StyleFormatter('lineHeight', {
  styles: {
    lineHeight: /.+/
  }
});
