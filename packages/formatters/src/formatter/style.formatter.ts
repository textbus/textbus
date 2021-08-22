import {
  InlineFormatter,
  MatchRule,
  FormatEffect,
  FormatData,
  VElement,
  FormatterPriority, FormatRendingContext
} from '@textbus/core';

export class StyleFormatter extends InlineFormatter {
  constructor(public styleName: string, rule: MatchRule) {
    super(rule, FormatterPriority.InlineStyle);
  }

  read(node: HTMLElement): FormatData {
    return this.extractData(node, {
      styleName: this.styleName
    });
  }

  render(context: FormatRendingContext, existingElement?: VElement) {
    if (existingElement) {
      existingElement.styles.set(this.styleName, context.formatData.styles.get(this.styleName));
    } else {
      const el = new VElement('span');
      el.styles.set(this.styleName, context.formatData.styles.get(this.styleName));
      return el;
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

export class InlineBackgroundColorFormatter extends StyleFormatter {
  static inlineTags = 'span,em,i,s,del,sup,sub,u,strong'.split(',');
  private reg: RegExp;

  constructor() {
    super('backgroundColor', {
      styles: {
        backgroundColor: /.+/
      }
    });
    this.reg = new RegExp(`^(${InlineBackgroundColorFormatter.inlineTags.join('|')})$`, 'i');
  }

  match(p: HTMLElement) {
    if (!this.reg.test(p.tagName)) {
      return FormatEffect.Invalid;
    }
    return super.match(p);
  }

  render(context: FormatRendingContext, existingElement?: VElement) {
    if (existingElement && this.reg.test(existingElement.tagName)) {
      existingElement.styles.set(this.styleName, context.formatData.styles.get(this.styleName));
    } else {
      const el = new VElement('span');
      el.styles.set(this.styleName, context.formatData.styles.get(this.styleName));
      return el;
    }
  }
}

export const backgroundColorFormatter = new InlineBackgroundColorFormatter();
