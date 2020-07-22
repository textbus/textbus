import {
  InlineFormatter,
  MatchRule,
  FormatEffect,
  FormatAbstractData,
  VElement,
  ChildSlotModel,
  FormatterPriority
} from '../core/_api';

const inlineTags = 'span,em,i,s,del,sup,sub,u,strong'.split(',');
const reg = new RegExp(`^(${inlineTags.join('|')})$`, 'i');

export class StyleFormatter extends InlineFormatter {
  constructor(public styleName: string, rule: MatchRule) {
    super(rule, FormatterPriority.InlineStyle);
  }

  read(node: HTMLElement): FormatAbstractData {
    return this.extractData(node, {
      styleName: this.styleName
    });
  }

  render(isProduction: boolean, state: FormatEffect, abstractData: FormatAbstractData, existingElement?: VElement) {
    if (existingElement && reg.test(existingElement.tagName)) {
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

export const backgroundColorFormatter = new StyleFormatter('backgroundColor', {
  styles: {
    backgroundColor: /.+/
  }
});

const match = backgroundColorFormatter.match;

backgroundColorFormatter.match = function (p: HTMLElement | FormatAbstractData) {
  if (!reg.test(p instanceof FormatAbstractData ? p.tag : p.tagName)) {
    return FormatEffect.Invalid;
  }
  return match.call(backgroundColorFormatter, p);
}
