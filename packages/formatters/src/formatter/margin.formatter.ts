import {
  BlockFormatter,
  FormatData,
  FormatEffect,
  FormatRendingContext,
  FormatterPriority,
  InlineFormatter,
  VElement
} from '@textbus/core';

function match(reg: RegExp, p: HTMLElement): FormatEffect {
  if (!reg.test(p instanceof FormatData ? p.tag : p.tagName)) {
    return FormatEffect.Invalid;
  }
  const styleKeys = ['margin', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom']
  return styleKeys.map(key => p.style[key]).filter(i => !!i).length > 0 ? FormatEffect.Valid : FormatEffect.Invalid;
}

function render(context: FormatRendingContext, reg: RegExp, existingElement?: VElement) {
  const margin = [
    context.formatData.styles.get('marginTop'),
    context.formatData.styles.get('marginRight'),
    context.formatData.styles.get('marginLeft'),
    context.formatData.styles.get('marginBottom'),
  ].map(i => i || 0);
  if (existingElement && reg.test(existingElement.tagName)) {
    existingElement.styles.set('margin', margin.join(' '));
    return null;
  }
  existingElement = new VElement('span');
  existingElement.styles.set('margin', margin.join(' '));
  return existingElement;
}

export class InlineMarginFormatter extends InlineFormatter {
  static inlineTags = 'span,em,i,s,del,sup,sub,u,strong'.split(',');
  reg: RegExp;

  constructor() {
    super({}, FormatterPriority.InlineStyle);
    this.reg = new RegExp(`^(${InlineMarginFormatter.inlineTags.join('|')})$`, 'i');
  }

  match(p: HTMLElement): FormatEffect {
    return match(this.reg, p);
  }

  read(node: HTMLElement): FormatData {
    return this.extractData(node, {
      styleName: ['marginLeft', 'marginRight', 'marginTop', 'marginBottom']
    });
  }

  render(context: FormatRendingContext, existingElement?: VElement) {
    return render(context, this.reg, existingElement);
  }
}

export class BlockMarginFormatter extends BlockFormatter {
  static blockTags = 'div,p,h1,h2,h3,h4,h5,h6,nav,header,footer,td,th,li,article'.split(',');
  reg: RegExp;

  constructor() {
    super({}, FormatterPriority.BlockStyle);
    this.reg = new RegExp(`^(${BlockMarginFormatter.blockTags.join('|')})$`, 'i');
  }

  match(p: HTMLElement): FormatEffect {
    return match(this.reg, p);
  }

  read(node: HTMLElement): FormatData {
    return this.extractData(node, {
      styleName: ['marginLeft', 'marginRight', 'marginTop', 'marginBottom']
    });
  }

  render(context: FormatRendingContext, existingElement?: VElement) {
    return render(context, this.reg, existingElement);
  }
}

export const inlineMarginFormatter = new InlineMarginFormatter();
export const blockMarginFormatter = new BlockMarginFormatter();
